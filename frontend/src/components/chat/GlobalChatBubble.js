'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, ChevronLeft, Send, Smile, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import io from 'socket.io-client';
import { chatAPI, uploadAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import styles from './GlobalChatBubble.module.css';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function GlobalChatBubble() {
    const pathname = usePathname();
    const { user, isAuthenticated, token } = useAuth();
    
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [popupMsg, setPopupMsg] = useState(null);

    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [socket, setSocket] = useState(null);
    const [showEmoji, setShowEmoji] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    const EMOJIS = ['😂', '❤️', '🔥', '👍', '😍', '🥹', '😭', '🙏', '✨', '😅', '🤩', '🫶', '😎', '🤗', '🥳', '😤', '💪', '⚽'];

    // Initial Socket & Notifications
    useEffect(() => {
        if (!isAuthenticated || !token || pathname === '/chat') return;

        const newSocket = io(SOCKET_URL, { auth: { token } });
        setSocket(newSocket);

        newSocket.on('message_notification', (data) => {
            if (!isOpen) {
                setUnreadCount(p => p + 1);
                setPopupMsg({
                    senderName: data.message.sender?.fullName || 'Ai đó',
                    content: data.message.type === 'IMAGE' ? '[Đã gửi 1 ảnh]' : 
                             data.message.type === 'SYSTEM' ? '[Yêu cầu ghép trận]' : data.message.content
                });
                setTimeout(() => setPopupMsg(null), 5000);
            }
            // Update rooms list if we opened it
            loadRooms();
        });

        newSocket.on('new_message', (msg) => {
            setMessages(prev => [...prev, msg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            loadRooms();
        });

        return () => newSocket.disconnect();
    }, [isAuthenticated, token, pathname, isOpen]);

    // Load rooms when opening
    useEffect(() => {
        if (isOpen && isAuthenticated) {
           loadRooms();
           setUnreadCount(0);
           setPopupMsg(null);
        }
    }, [isOpen, isAuthenticated]);

    const loadRooms = async () => {
        try {
            const res = await chatAPI.getRooms();
            const rawRooms = res.data.data.rooms;
            const uniqueRooms = new Map();
            rawRooms.forEach(room => {
                const otherUser = room.members?.find(m => m.user.id !== user?.id)?.user;
                if (!otherUser) return;
                const existing = uniqueRooms.get(otherUser.id);
                if (!existing) uniqueRooms.set(otherUser.id, room);
            });
            const deduplicatedRooms = Array.from(uniqueRooms.values()).sort((a, b) => {
                const timeA = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
                const timeB = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
                return timeB - timeA;
            });
            setRooms(deduplicatedRooms);
        } catch (err) { console.error('Failed to load rooms:', err); }
    };

    const getOtherUser = (room) => {
        return room.members?.find(m => m.user.id !== user?.id)?.user || {};
    };

    const selectRoom = async (room) => {
        setActiveRoom(room);
        try {
            const { data } = await chatAPI.getMessages(room.id);
            setMessages(data.data.messages);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            if (socket) {
                socket.emit('join_room', room.id);
                socket.emit('mark_read', { roomId: room.id });
            }
        } catch (err) { console.error('Failed to load messages:', err); }
    };

    const insertEmoji = (e, emoji) => {
        e.preventDefault();
        setInput(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom || !socket) return;
        try {
            const res = await uploadAPI.single(file);
            const imageUrl = res.data.data.url;

            const tempMsg = {
                id: `temp-${Date.now()}`,
                roomId: activeRoom.id,
                senderId: user.id,
                content: imageUrl,
                createdAt: new Date().toISOString(),
                sender: user,
                type: 'IMAGE',
                _pending: true
            };
            setMessages(prev => [...prev, tempMsg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            socket.emit('send_message', {
                roomId: activeRoom.id,
                content: imageUrl,
                type: 'IMAGE'
            });
            loadRooms();
            setShowEmoji(false);
        } catch (err) {
            console.error('Upload fail', err);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeRoom || !socket) return;
        const content = input.trim();
        setInput('');

        const tempMsg = {
            id: `temp-${Date.now()}`,
            roomId: activeRoom.id,
            senderId: user.id,
            content,
            createdAt: new Date().toISOString(),
            sender: user,
            type: 'TEXT',
            _pending: true
        };
        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        socket.emit('send_message', {
            roomId: activeRoom.id,
            content,
            type: 'TEXT'
        });
        loadRooms(); // update sidebar immediately
    };

    if (pathname === '/chat' || !isAuthenticated) return null;

    return (
        <div className={styles.container}>
            {popupMsg && !isOpen && (
                <div className={styles.popup} onClick={() => setIsOpen(true)}>
                    <div className={styles.popupTitle}>Tin nhắn mới từ {popupMsg.senderName}</div>
                    <div className={styles.popupContent}>{popupMsg.content}</div>
                </div>
            )}

            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                        {activeRoom ? (
                            <>
                                <button className={styles.backBtn} onClick={() => setActiveRoom(null)}>
                                    <ChevronLeft size={20} />
                                </button>
                                <div className={styles.headerInfo}>
                                    <Avatar user={getOtherUser(activeRoom)} size="sm" />
                                    <span className={styles.headerName}>{getOtherUser(activeRoom).fullName}</span>
                                </div>
                            </>
                        ) : (
                            <h3 className={styles.headerTitle}>Tin nhắn</h3>
                        )}
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className={styles.chatBody}>
                        {!activeRoom ? (
                            <div className={styles.roomList}>
                                {rooms.length === 0 ? (
                                    <div className={styles.emptyText}>Chưa có cuộc trò chuyện</div>
                                ) : (
                                    rooms.map(room => {
                                        const other = getOtherUser(room);
                                        return (
                                            <div key={room.id} className={styles.roomItem} onClick={() => selectRoom(room)}>
                                                <Avatar user={other} />
                                                <div className={styles.roomInfo}>
                                                    <div className={styles.roomName}>{other.fullName}</div>
                                                    <div className={styles.roomPreview}>
                                                        {room.lastMessage?.senderId === user?.id ? 'Bạn: ' : ''}
                                                        {room.lastMessage ? (
                                                            room.lastMessage.type === 'IMAGE' ? 'Đã gửi 1 ảnh' :
                                                            room.lastMessage.type === 'SYSTEM' ? 'Yêu cầu ghép trận' :
                                                            room.lastMessage.content
                                                        ) : 'Bắt đầu trò chuyện'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className={styles.messageList}>
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderId === user?.id;
                                    return (
                                        <div key={msg.id || idx} className={`${styles.messageRow} ${isOwn ? styles.ownRow : styles.otherRow}`}>
                                            {!isOwn && <Avatar user={msg.sender} size="xs" />}
                                            <div className={[
                                                styles.messageBubble,
                                                isOwn ? styles.ownBubble : styles.otherBubble,
                                                msg.type === 'IMAGE' ? styles.imageBubble : ''
                                            ].join(' ')}>
                                                {msg.type === 'IMAGE' ? (
                                                    <img src={msg.content.startsWith('http') ? msg.content : `${SOCKET_URL}${msg.content}`}
                                                         alt="Attached" className={styles.msgImage} />
                                                ) : msg.type === 'SYSTEM' ? (
                                                    <span className={styles.systemText}>[Trạng thái ghép trận, ấn để xem chi tiết]</span>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {activeRoom && (
                        <div className={styles.inputWrapper}>
                            {showEmoji && (
                                <div className={styles.emojiTray}>
                                    {EMOJIS.map((emoji, idx) => (
                                        <button key={idx} className={styles.emojiBtn} onClick={(e) => insertEmoji(e, emoji)}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <form className={styles.chatInputArea} onSubmit={sendMessage}>
                                <button type="button" className={styles.iconBtn} title="Biểu tượng" onClick={() => setShowEmoji(!showEmoji)}>
                                    <Smile size={20} strokeWidth={2} />
                                </button>
                                <input 
                                    ref={inputRef}
                                    value={input} 
                                    onChange={e => setInput(e.target.value)} 
                                    placeholder="Nhập tin nhắn..." 
                                    className={styles.chatInput}
                                    onClick={() => setShowEmoji(false)}
                                />
                                <button type="button" className={styles.iconBtn} title="Gửi ảnh" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon size={20} strokeWidth={2} />
                                </button>
                                <input 
                                    type="file" 
                                    hidden 
                                    ref={fileInputRef} 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                />
                                <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
                                    <Send size={18} strokeWidth={2} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
            
            {!isOpen && (
                <button className={styles.fab} onClick={() => setIsOpen(true)}>
                    <div className={styles.tooltip}>Tin nhắn</div>
                    <MessageCircle fill="#FF5A00" size={32} strokeWidth={1.5} />
                    {unreadCount > 0 && (
                        <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </button>
            )}
        </div>
    );
}
