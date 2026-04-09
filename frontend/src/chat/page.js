'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI, matchmakingAPI, uploadAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import {
    Send, Smile, Heart, Image, Mic, Phone, Video,
    Search, ArrowLeft, Check, CheckCheck, ChevronDown,
    MessageCircle
} from 'lucide-react';
import io from 'socket.io-client';
import styles from './chat.module.css';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const EMOJIS = ['😂', '❤️', '🔥', '👍', '😍', '🥹', '😭', '🙏', '✨', '😅', '🤩', '🫶', '😎', '🤗', '🥳', '😤', '💪', '⚽'];
const STICKERS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'];

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated, token, loading: authLoading } = useAuth();

    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [typing, setTyping] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [unreadMap, setUnreadMap] = useState({});       // { roomId: count }
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [mobileSidebar, setMobileSidebar] = useState(true);

    // Tray state: 'emoji' | 'sticker' | 'image' | null
    const [openTray, setOpenTray] = useState(null);
    const [micActive, setMicActive] = useState(false);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messageListRef = useRef(null);
    const activeRoomIdRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const lastTypingEmit = useRef(0);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        activeRoomIdRef.current = activeRoom?.id;
    }, [activeRoom]);

    // ── 1. Auth & load rooms ──
    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (isAuthenticated) loadRooms();
    }, [isAuthenticated, authLoading, router]);

    // ── 2. Socket ──
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('🟢 Socket connected');
            // Rejoin active room on reconnect
            if (activeRoomIdRef.current) {
                socket.emit('join_room', activeRoomIdRef.current);
            }
        });

        socket.on('new_message', (message) => {
            if (String(activeRoomIdRef.current) === String(message.roomId)) {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
                // Mark as read immediately
                socket.emit('mark_read', { roomId: message.roomId });
            } else {
                // Increment unread count for that room
                setUnreadMap(prev => ({
                    ...prev,
                    [message.roomId]: (prev[message.roomId] || 0) + 1,
                }));
            }
            updateRoomList(message);
        });

        socket.on('user_typing', ({ fullName, roomId }) => {
            if (String(activeRoomIdRef.current) === String(roomId)) {
                setTyping(fullName);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTyping(null), 2500);
            }
        });

        // Online / offline
        socket.on('user_online', ({ userId }) => {
            setOnlineUsers(prev => new Set([...prev, userId]));
        });
        socket.on('user_offline', ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });
        socket.on('online_users', (ids) => {
            setOnlineUsers(new Set(ids));
        });

        // Read receipts
        socket.on('message_read', ({ messageId }) => {
            setMessages(prev =>
                prev.map(m => m.id === messageId ? { ...m, isRead: true } : m)
            );
        });
        socket.on('all_messages_read', ({ userId: readerId, roomId }) => {
            if (String(activeRoomIdRef.current) === String(roomId)) {
                setMessages(prev =>
                    prev.map(m =>
                        m.senderId === user?.id ? { ...m, isRead: true } : m
                    )
                );
            }
        });

        socket.on('disconnect', () => {
            console.log('🔴 Socket disconnected');
        });

        socketRef.current = socket;
        return () => {
            clearTimeout(typingTimeoutRef.current);
            socket.disconnect();
        };
    }, [isAuthenticated, token]);


    const loadRooms = async () => {
        try {
            const res = await chatAPI.getRooms();
            const rawRooms = res.data.data.rooms;

            const uniqueRooms = new Map();
            rawRooms.forEach(room => {
                const otherUser = room.members?.find(m => m.user.id !== user?.id)?.user;
                if (!otherUser) return;

                const existing = uniqueRooms.get(otherUser.id);
                if (!existing) {
                    uniqueRooms.set(otherUser.id, room);
                } else {
                    // Keep the one with the most recent activity
                    const existingTime = new Date(existing.lastMessage?.createdAt || existing.createdAt).getTime();
                    const currentTime = new Date(room.lastMessage?.createdAt || room.createdAt).getTime();
                    if (currentTime > existingTime) {
                        uniqueRooms.set(otherUser.id, room);
                    }
                }
            });

            // Re-sort just in case
            const deduplicatedRooms = Array.from(uniqueRooms.values()).sort((a, b) => {
                const timeA = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
                const timeB = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
                return timeB - timeA;
            });

            setRooms(deduplicatedRooms);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const updateRoomList = (message) => {
        setRooms(prev => {
            const next = [...prev];
            const idx = next.findIndex(r => String(r.id) === String(message.roomId));
            if (idx !== -1) {
                const [room] = next.splice(idx, 1);
                room.lastMessage = message;
                next.unshift(room);
            }
            return next;
        });
    };

    // ── Select room ──
    const selectRoom = async (room) => {
        setActiveRoom(room);
        setOpenTray(null);
        setMobileSidebar(false);

        // Clear unread
        setUnreadMap(prev => ({ ...prev, [room.id]: 0 }));

        if (socketRef.current) {
            socketRef.current.emit('join_room', room.id);
            socketRef.current.emit('mark_read', { roomId: room.id });
        }
        try {
            const { data } = await chatAPI.getMessages(room.id);
            setMessages(data.data.messages);
            scrollToBottom();
        } catch (err) { console.error(err); }
    };

    // ── Send message ──
    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeRoom) return;
        const content = input.trim();
        setInput('');
        setOpenTray(null);

        const tempMsg = {
            id: `temp-${Date.now()}`,
            roomId: activeRoom.id,
            senderId: user.id,
            content,
            createdAt: new Date().toISOString(),
            sender: user,
            isRead: false,
            _pending: true,
        };
        setMessages(prev => [...prev, tempMsg]);
        updateRoomList(tempMsg);
        scrollToBottom();

        socketRef.current.emit('send_message', {
            roomId: activeRoom.id,
            content,
            type: 'TEXT',
        });
    };

    // ── Match Request Actions ──
    const handleMatchRequestAction = async (msgId, actionData, actionType) => {
        try {
            // Update message optimistic UI first
            setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                    return { ...m, content: JSON.stringify({ ...actionData, status: actionType }) };
                }
                return m;
            }));

            if (actionType === 'ACCEPTED') {
                await matchmakingAPI.acceptRequest(actionData.requestId);
            } else if (actionType === 'REJECTED') {
                await matchmakingAPI.rejectRequest(actionData.requestId);
            }
        } catch (err) {
            console.error('Action error:', err);
            // Revert on error could be implemented here
            alert('Có lỗi xảy ra, vui lòng thử lại');
        }
    };

    // ── Quick send emoji/sticker ──
    const sendQuick = useCallback((content) => {
        if (!activeRoom) return;
        setOpenTray(null);
        const tempMsg = {
            id: `temp-${Date.now()}`,
            roomId: activeRoom.id,
            senderId: user.id,
            content,
            createdAt: new Date().toISOString(),
            sender: user,
            isRead: false,
            _pending: true,
        };
        setMessages(prev => [...prev, tempMsg]);
        updateRoomList(tempMsg);
        scrollToBottom();
        socketRef.current?.emit('send_message', {
            roomId: activeRoom.id,
            content,
            type: 'TEXT',
        });
    }, [activeRoom, user]);

    // ── Insert emoji to input ──
    const insertEmoji = useCallback((emoji) => {
        setInput(prev => prev + emoji);
        setOpenTray(null);
        inputRef.current?.focus();
    }, []);

    // ── Image upload ──
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom) return;
        
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
                isRead: false,
                _pending: true,
                type: 'IMAGE',
            };
            
            setMessages(prev => [...prev, tempMsg]);
            updateRoomList(tempMsg);
            scrollToBottom();
            setOpenTray(null);

            socketRef.current?.emit('send_message', {
                roomId: activeRoom.id,
                content: imageUrl,
                type: 'IMAGE',
            });
        } catch (error) {
            console.error('Image upload failed', error);
            alert('Tải ảnh lên thất bại!');
        }
    };

    // ── CRITICAL: Emit typing event ──
    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!activeRoom || !socketRef.current) return;

        const now = Date.now();
        if (now - lastTypingEmit.current > 2000) {
            socketRef.current.emit('typing', {
                roomId: activeRoom.id,
                userId: user.id,
                fullName: user.fullName,
            });
            lastTypingEmit.current = now;
        }
    };

    const toggleTray = (name) => {
        setOpenTray(prev => prev === name ? null : name);
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // ── Scroll listener for "scroll to bottom" button ──
    const handleScroll = () => {
        if (!messageListRef.current) return;
        const el = messageListRef.current;
        const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(diff > 200);
    };

    const getOtherUser = (room) =>
        room.members?.find(m => m.userId !== user?.id)?.user || {};

    const isUserOnline = (room) => {
        const other = getOtherUser(room);
        return onlineUsers.has(other.id);
    };

    // ── Filter rooms by search ──
    const filteredRooms = useMemo(() => {
        if (!searchQuery.trim()) return rooms;
        const q = searchQuery.toLowerCase();
        return rooms.filter(room => {
            const other = getOtherUser(room);
            return other.fullName?.toLowerCase().includes(q);
        });
    }, [rooms, searchQuery, user]);

    // ── Time formatting ──
    const formatTimeDivider = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const oneDay = 86400000;
        const pad = n => n.toString().padStart(2, '0');
        if (diff < oneDay && date.getDate() === now.getDate())
            return `Hôm nay ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        if (diff < 2 * oneDay)
            return `Hôm qua ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatShortTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const pad = n => n.toString().padStart(2, '0');

        if (diff < 60000) return 'Vừa xong';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
        if (diff < 86400000 && date.getDate() === now.getDate())
            return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        if (diff < 172800000) return 'Hôm qua';
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
    };

    const shouldShowTime = (idx) => {
        if (idx === 0) return true;
        const prev = new Date(messages[idx - 1].createdAt);
        const curr = new Date(messages[idx].createdAt);
        return (curr - prev) > 10 * 60 * 1000;
    };

    // ── Custom Message Renderer ──
    const renderMessageContent = (msg) => {
        if (msg.type === 'SYSTEM') {
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.action === 'MATCH_REQUEST') {
                    const isSender = msg.senderId === user?.id;
                    return (
                        <div className={styles.matchRequestMsg}>
                            <h4 className={styles.matchRequestTitle}>🏆 Yêu cầu ghép trận mới</h4>
                            <div className={styles.matchRequestDetails}>
                                <div className={styles.matchDetailRow}>
                                    <span className={styles.matchDetailLabel}>Môn:</span>
                                    <span className={styles.matchDetailValue}><b>{parsed.sportType}</b></span>
                                </div>
                                <div className={styles.matchDetailRow}>
                                    <span className={styles.matchDetailLabel}>Thời gian:</span>
                                    <span className={styles.matchDetailValue}><b>{parsed.bookingDate}</b>, {parsed.startTime} - {parsed.endTime}</span>
                                </div>
                                {parsed.address && (
                                    <div className={styles.matchDetailRow}>
                                        <span className={styles.matchDetailLabel}>Địa điểm:</span>
                                        <span className={styles.matchDetailValue}>{parsed.address}</span>
                                    </div>
                                )}
                                {parsed.note && (
                                    <div className={styles.matchDetailRow}>
                                        <span className={styles.matchDetailLabel}>Ghi chú:</span>
                                        <span className={styles.matchDetailValue}><i>{parsed.note}</i></span>
                                    </div>
                                )}
                            </div>
                            <div className={styles.matchRequestActions}>
                                {parsed.status === 'PENDING' ? (
                                    isSender ? (
                                        <span className={styles.matchStatusPending}>Đang chờ phản hồi...</span>
                                    ) : (
                                        <>
                                            <button
                                                className={styles.acceptBtn}
                                                onClick={() => handleMatchRequestAction(msg.id, parsed, 'ACCEPTED')}>
                                                Đồng ý
                                            </button>
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => handleMatchRequestAction(msg.id, parsed, 'REJECTED')}>
                                                Từ chối
                                            </button>
                                        </>
                                    )
                                ) : parsed.status === 'ACCEPTED' ? (
                                    <span className={styles.matchStatusAccepted}>✅ Đã chốt kèo</span>
                                ) : (
                                    <span className={styles.matchStatusRejected}>❌ Đã từ chối</span>
                                )}
                            </div>
                        </div>
                    );
                }
            } catch (e) {
                // Not JSON, fallback to standard text below
            }
        }
        if (msg.type === 'IMAGE') {
            const imgSrc = msg.content.startsWith('http') ? msg.content : `${SOCKET_URL}${msg.content}`;
            return (
                <div className={styles.imageMessageWrapper}>
                    <img src={imgSrc} alt="Sent image" className={styles.sentImage} />
                </div>
            );
        }
        return msg.content;
    };

    // ── Total unread count ──
    const totalUnread = Object.values(unreadMap).reduce((s, n) => s + n, 0);

    return (
        <div className={styles.page}>
            <div className={styles.chatLayout}>

                {/* ══════════════════ SIDEBAR ══════════════════ */}
                <div className={`${styles.sidebar} ${mobileSidebar ? styles.sidebarShow : ''}`}>

                    {/* Sidebar header */}
                    <div className={styles.sidebarHeader}>
                        <div className={styles.sidebarTitle}>
                            <h2>Đoạn chat</h2>
                            {totalUnread > 0 && (
                                <span className={styles.totalBadge}>{totalUnread}</span>
                            )}
                        </div>
                        <button
                            className={styles.searchToggle}
                            onClick={() => setShowSearch(v => !v)}
                            title="Tìm kiếm"
                        >
                            <Search size={18} />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className={`${styles.searchBar} ${showSearch ? styles.searchBarOpen : ''}`}>
                        <Search size={14} className={styles.searchIcon} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm cuộc trò chuyện..."
                            autoFocus={showSearch}
                        />
                    </div>

                    {/* Room list */}
                    <div className={styles.roomList}>
                        {loading ? (
                            <div className={styles.roomSkeleton}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={styles.skeletonItem}>
                                        <div className={styles.skeletonAvatar} />
                                        <div className={styles.skeletonLines}>
                                            <div className={styles.skeletonLine} />
                                            <div className={`${styles.skeletonLine} ${styles.short}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className={styles.emptySearch}>
                                <MessageCircle size={24} />
                                <span>{searchQuery ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện'}</span>
                            </div>
                        ) : (
                            filteredRooms.map(room => {
                                const other = getOtherUser(room);
                                const online = onlineUsers.has(other.id);
                                const unread = unreadMap[room.id] || 0;

                                return (
                                    <div
                                        key={room.id}
                                        className={`${styles.roomItem} ${activeRoom?.id === room.id ? styles.roomActive : ''} ${unread > 0 ? styles.roomUnread : ''}`}
                                        onClick={() => selectRoom(room)}
                                    >
                                        <div className={styles.avatarWrap}>
                                            <Avatar user={other} />
                                            <span className={online ? styles.onlineDot : styles.offlineDot} />
                                        </div>
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomTopRow}>
                                                <div className={styles.roomName}>{other.fullName}</div>
                                                <span className={styles.roomTime}>
                                                    {formatShortTime(room.lastMessage?.createdAt)}
                                                </span>
                                            </div>
                                            <div className={styles.roomBottomRow}>
                                                <div className={styles.roomPreview}>
                                                    {room.lastMessage?.senderId === user?.id && (
                                                        <span className={styles.youPrefix}>Bạn: </span>
                                                    )}
                                                    {room.lastMessage ? (
                                                        room.lastMessage.type === 'IMAGE' ? 'đã gửi 1 ảnh' :
                                                        room.lastMessage.type === 'SYSTEM' ? 'Yêu cầu ghép trận' :
                                                        room.lastMessage.content
                                                    ) : 'Chưa có tin nhắn'}
                                                </div>
                                                {unread > 0 && (
                                                    <span className={styles.unreadBadge}>
                                                        {unread > 9 ? '9+' : unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ══════════════════ CHAT MAIN ══════════════════ */}
                <div className={styles.chatMain}>
                    {activeRoom ? (
                        <>
                            {/* ── Header ── */}
                            <div className={styles.chatHeader}>
                                <button
                                    className={styles.backBtn}
                                    onClick={() => setMobileSidebar(true)}
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className={styles.avatarWrap}>
                                    <Avatar user={getOtherUser(activeRoom)} size="sm" />
                                    {isUserOnline(activeRoom) && (
                                        <span className={styles.onlineDotSm} />
                                    )}
                                </div>

                                <div className={styles.headerInfo}>
                                    <strong>{getOtherUser(activeRoom).fullName}</strong>
                                    {typing ? (
                                        <span className={styles.headerTyping}>Đang nhập...</span>
                                    ) : isUserOnline(activeRoom) ? (
                                        <span className={styles.headerOnline}>Đang hoạt động</span>
                                    ) : (
                                        <span className={styles.headerOffline}>Ngoại tuyến</span>
                                    )}
                                </div>

                                <div className={styles.chatHeaderActions}>
                                    <button className={styles.headerIconBtn} title="Gọi thoại">
                                        <Phone size={16} />
                                    </button>
                                    <button className={styles.headerIconBtn} title="Gọi video">
                                        <Video size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* ── Messages ── */}
                            <div
                                className={styles.messageList}
                                ref={messageListRef}
                                onScroll={handleScroll}
                            >
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderId === user?.id;
                                    const showTime = shouldShowTime(idx);
                                    const isContinued =
                                        idx > 0 &&
                                        messages[idx - 1].senderId === msg.senderId &&
                                        !showTime;
                                    const isLast = idx === messages.length - 1;
                                    const isLastOwn = isOwn && (
                                        isLast ||
                                        messages[idx + 1]?.senderId !== user?.id
                                    );

                                    return (
                                        <div key={msg.id || idx}>
                                            {showTime && (
                                                <div className={styles.timeDivider}>
                                                    <span className={styles.timeDividerText}>
                                                        {formatTimeDivider(msg.createdAt)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={[
                                                styles.messageRow,
                                                isOwn ? styles.ownRow : styles.otherRow,
                                                isContinued ? styles.sameSender : styles.differentSender,
                                            ].join(' ')}>
                                                {!isOwn && (
                                                    isContinued
                                                        ? <div className={styles.avatarPlaceholder} />
                                                        : <Avatar user={msg.sender} size="xs" />
                                                )}
                                                <div className={styles.bubbleGroup}>
                                                    <div className={[
                                                        styles.messageBubble,
                                                        isOwn ? styles.own : styles.other,
                                                        isContinued && isOwn ? styles.ownContinued : '',
                                                        isContinued && !isOwn ? styles.otherContinued : '',
                                                        msg._pending ? styles.pending : '',
                                                        msg.type === 'SYSTEM' ? styles.systemBubble : '',
                                                        msg.type === 'IMAGE' ? styles.imageBubble : '',
                                                    ].join(' ')}>
                                                        {renderMessageContent(msg)}
                                                    </div>

                                                    {/* Read receipt for own messages */}
                                                    {isOwn && isLastOwn && (
                                                        <div className={styles.readReceipt}>
                                                            {msg.isRead ? (
                                                                <CheckCheck size={13} className={styles.readIcon} />
                                                            ) : (
                                                                <Check size={13} className={styles.sentIcon} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Typing indicator */}
                                {typing && (
                                    <div className={styles.messageRow + ' ' + styles.otherRow + ' ' + styles.differentSender}>
                                        <div className={styles.typingBubble}>
                                            <div className={styles.typingDot} />
                                            <div className={styles.typingDot} />
                                            <div className={styles.typingDot} />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Scroll-to-bottom button */}
                            {showScrollBtn && (
                                <button
                                    className={styles.scrollDownBtn}
                                    onClick={scrollToBottom}
                                >
                                    <ChevronDown size={20} />
                                </button>
                            )}

                            {/* ── Sticker tray ── */}
                            <div className={`${styles.tray} ${styles.stickerTray} ${openTray === 'sticker' ? styles.trayOpen : ''}`}>
                                {STICKERS.map(s => (
                                    <button key={s} className={styles.stickerItem} onClick={() => sendQuick(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* ── Emoji tray ── */}
                            <div className={`${styles.tray} ${styles.emojiTray} ${openTray === 'emoji' ? styles.trayOpen : ''}`}>
                                {EMOJIS.map(e => (
                                    <button key={e} className={styles.emojiBtn} onClick={() => insertEmoji(e)}>
                                        {e}
                                    </button>
                                ))}
                            </div>

                            {/* ── Input bar ── */}
                            <form className={styles.chatInput} onSubmit={sendMessage}>
                                <button
                                    type="button"
                                    className={`${styles.iconBtn} ${openTray === 'emoji' ? styles.iconActive : ''}`}
                                    onClick={() => toggleTray('emoji')}
                                >
                                    <Smile size={20} />
                                    <span className={styles.btnTooltip}>Biểu cảm</span>
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.iconBtn} ${openTray === 'sticker' ? styles.iconActive : ''}`}
                                    onClick={() => toggleTray('sticker')}
                                >
                                    <Heart size={20} />
                                    <span className={styles.btnTooltip}>Sticker</span>
                                </button>

                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Nhập tin nhắn..."
                                />

                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => {
                                        setOpenTray(null);
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Image size={20} />
                                    <span className={styles.btnTooltip}>Gửi ảnh</span>
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.iconBtn} ${micActive ? styles.iconActive : ''}`}
                                    onClick={() => setMicActive(v => !v)}
                                >
                                    <Mic size={20} />
                                    <span className={styles.btnTooltip}>Ghi âm</span>
                                </button>

                                <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
                                    <Send size={16} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className={styles.noChat}>
                            <div className={styles.noChatIcon}>
                                <MessageCircle size={32} color="#FF6E40" />
                            </div>
                            <span className={styles.noChatTitle}>Tin nhắn của bạn</span>
                            <span className={styles.noChatText}>
                                Chọn một cuộc trò chuyện để bắt đầu nhắn tin
                            </span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}