'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import io from 'socket.io-client';
import styles from './chat.module.css';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated, token, loading: authLoading } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [typing, setTyping] = useState(null);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeout = useRef(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (isAuthenticated) {
            loadRooms();
            connectSocket();
        }
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [isAuthenticated, authLoading]);

    const connectSocket = useCallback(() => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => console.log('Socket connected'));

        socket.on('new_message', (message) => {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
            // Update room last message
            setRooms(prev => prev.map(r =>
                r.id === message.roomId
                    ? { ...r, lastMessage: message, updatedAt: message.createdAt }
                    : r
            ));
        });

        socket.on('user_typing', ({ userId, fullName }) => {
            setTyping(fullName);
            clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => setTyping(null), 2000);
        });

        socket.on('message_read', ({ messageId }) => {
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, isRead: true } : m
            ));
        });

        socketRef.current = socket;
    }, [token]);

    const loadRooms = async () => {
        try {
            const { data } = await chatAPI.getRooms();
            setRooms(data.data.rooms);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const selectRoom = async (room) => {
        setActiveRoom(room);
        setMessages([]);

        // Join socket room
        if (socketRef.current) {
            socketRef.current.emit('join_room', room.id);
        }

        // Load messages
        try {
            const { data } = await chatAPI.getMessages(room.id, { limit: 50 });
            setMessages(data.data.messages.reverse());
            scrollToBottom();
        } catch (err) { console.error(err); }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeRoom) return;

        const content = input.trim();
        setInput('');

        // Send via socket
        if (socketRef.current) {
            socketRef.current.emit('send_message', {
                roomId: activeRoom.id,
                content,
                type: 'TEXT',
            });
        }
    };

    const handleTyping = () => {
        if (socketRef.current && activeRoom) {
            socketRef.current.emit('typing', {
                roomId: activeRoom.id,
                userId: user.id,
                fullName: user.fullName,
            });
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const getOtherUser = (room) => {
        const other = room.members?.find(m => m.userId !== user?.id);
        return other?.user || { fullName: room.name || 'Chat Room' };
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Hôm nay';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
        return d.toLocaleDateString('vi-VN');
    };

    return (
        <div className={styles.page}>
            <div className={styles.chatLayout}>
                {/* Sidebar - Room List */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>Tin nhắn</h2>
                        <span className="caption">{rooms.length} cuộc trò chuyện</span>
                    </div>

                    <div className={styles.roomList}>
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className={styles.roomSkeleton}>
                                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                                        <div className="skeleton" style={{ height: 12, width: '80%' }} />
                                    </div>
                                </div>
                            ))
                        ) : rooms.length === 0 ? (
                            <div className={styles.emptyRooms}>
                                <span>💬</span>
                                <p>Chưa có tin nhắn</p>
                                <span className="caption">Ghép trận để bắt đầu trò chuyện</span>
                            </div>
                        ) : (
                            rooms.map((room) => {
                                const other = getOtherUser(room);
                                return (
                                    <button
                                        key={room.id}
                                        className={`${styles.roomItem} ${activeRoom?.id === room.id ? styles.roomActive : ''}`}
                                        onClick={() => selectRoom(room)}
                                    >
                                        <Avatar user={other} />
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomName}>
                                                {room.type === 'MATCH_GROUP' ? `🤝 ${room.name || 'Nhóm ghép trận'}` : other.fullName}
                                            </div>
                                            {room.lastMessage && (
                                                <div className={styles.roomPreview}>
                                                    {room.lastMessage.senderId === user?.id ? 'Bạn: ' : ''}
                                                    {room.lastMessage.content?.substring(0, 40)}
                                                    {room.lastMessage.content?.length > 40 ? '...' : ''}
                                                </div>
                                            )}
                                        </div>
                                        {room.lastMessage && (
                                            <span className={styles.roomTime}>{formatTime(room.lastMessage.createdAt)}</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={styles.chatMain}>
                    {!activeRoom ? (
                        <div className={styles.noChatSelected}>
                            <div className={styles.noChatIcon}>💬</div>
                            <h3>Chọn cuộc trò chuyện</h3>
                            <p className="caption">Chọn một cuộc trò chuyện từ danh sách bên trái</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className={styles.chatHeader}>
                                <button className={styles.backBtn} onClick={() => setActiveRoom(null)}>←</button>
                                <Avatar user={getOtherUser(activeRoom)} size="sm" />
                                <div>
                                    <strong className="body-sm">
                                        {activeRoom.type === 'MATCH_GROUP'
                                            ? activeRoom.name || 'Nhóm ghép trận'
                                            : getOtherUser(activeRoom).fullName}
                                    </strong>
                                    {typing && <div className={styles.typingIndicator}>{typing} đang gõ...</div>}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className={styles.messageList}>
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderId === user?.id;
                                    const showDate = idx === 0 || formatDate(messages[idx - 1].createdAt) !== formatDate(msg.createdAt);

                                    return (
                                        <div key={msg.id || idx}>
                                            {showDate && (
                                                <div className={styles.dateDivider}>
                                                    <span>{formatDate(msg.createdAt)}</span>
                                                </div>
                                            )}
                                            {msg.type === 'SYSTEM' ? (
                                                <div className={styles.systemMsg}>{msg.content}</div>
                                            ) : (
                                                <div className={`${styles.messageBubble} ${isOwn ? styles.own : styles.other}`}>
                                                    {!isOwn && (
                                                        <div className={styles.msgSender}>{msg.sender?.fullName}</div>
                                                    )}
                                                    <div className={styles.msgContent}>{msg.content}</div>
                                                    <div className={styles.msgMeta}>
                                                        <span>{formatTime(msg.createdAt)}</span>
                                                        {isOwn && (
                                                            <span className={styles.readStatus}>{msg.isRead ? '✓✓' : '✓'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form className={styles.chatInput} onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    placeholder="Nhập tin nhắn..."
                                    value={input}
                                    onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                                    autoFocus
                                />
                                <button type="submit" disabled={!input.trim()} className={styles.sendBtn}>
                                    ➤
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
