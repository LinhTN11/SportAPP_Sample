'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, ChevronLeft, Send, Smile, Image as ImageIcon, Bot } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { chatAPI, uploadAPI, chatbotAPI, bookingsAPI, matchmakingAPI, getImageUrl } from '@/lib/api';
import {
    CHAT_SOCKET_URL,
    createChatSocket,
    registerChatSocketHandlers,
    joinChatRoom,
    sendChatMessage,
    markChatRoomRead,
} from '@/lib/chatRealtime';
import Avatar from '@/components/Avatar';
import ChatCardRenderer from './ChatCardRenderer';
import BookingFormModal from './BookingFormModal';
import styles from './GlobalChatBubble.module.css';

const ASSISTANT_ROOM_ID = 'assistant';
const getAiHistoryKey = (userId) => `sportapp-ai-chat-history-v2-${userId || 'guest'}`;
const AI_GREETING = 'Xin chào! Tôi là trợ lý ảo SportApp. Tôi có thể giúp gì cho bạn hôm nay?';
const WEATHER_QUERY_REGEX = /(thoi tiet|thời tiết|du bao|dự báo|mua khong|mưa không|co mua khong|có mưa không|nang|nắng|gio|gió|weather)/i;

const isWeatherQuery = (text = '') => WEATHER_QUERY_REGEX.test(text);

const buildWeatherCommand = (location) => {
    if (location?.lat && location?.lng) {
        return `get_weather lat=${location.lat} lon=${location.lng}`;
    }
    return 'get_weather';
};

const serializeAiHistory = (messages = []) => JSON.stringify(
    messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolResults: m.toolResults || [],
    }))
);

const formatAiToWidgetMessages = (aiMessages, currentUser) => {
    if (!Array.isArray(aiMessages)) return [];
    return aiMessages.map((m, i) => ({
        id: m.id || `ai-${i}`,
        senderId: m.role === 'user' ? currentUser?.id : 'bot',
        content: m.content,
        type: m.type || 'TEXT',
        toolResults: m.toolResults,
        sender: m.role === 'user' ? currentUser : { fullName: 'Trợ lý SportApp', role: 'BOT' },
    }));
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const getSlotPrice = (pricingRules, slotStartMinutes, slotDurationMinutes, dayOfWeek) => {
    if (!pricingRules || pricingRules.length === 0) return 0;
    const bookStart = slotStartMinutes;
    const bookEnd = slotStartMinutes + slotDurationMinutes;
    let totalPrice = 0;

    for (const rule of pricingRules) {
        if (rule.dayOfWeek && rule.dayOfWeek.length > 0 && !rule.dayOfWeek.includes(dayOfWeek)) continue;
        let ruleStart = timeToMinutes(rule.startTime);
        let ruleEnd = timeToMinutes(rule.endTime);
        if (ruleEnd <= ruleStart) ruleEnd += 24 * 60;

        const intervals = [
            { start: ruleStart - 24 * 60, end: ruleEnd - 24 * 60 },
            { start: ruleStart, end: ruleEnd },
            { start: ruleStart + 24 * 60, end: ruleEnd + 24 * 60 },
        ];

        for (const iv of intervals) {
            const overlapStart = Math.max(bookStart, iv.start);
            const overlapEnd = Math.min(bookEnd, iv.end);
            if (overlapStart < overlapEnd) {
                const overlapHours = (overlapEnd - overlapStart) / 60;
                totalPrice += overlapHours * Number(rule.price);
            }
        }
    }

    if (totalPrice === 0) {
        const matchingRule = pricingRules.find(
            (r) => !r.dayOfWeek || r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek)
        );
        if (matchingRule) totalPrice = (slotDurationMinutes / 60) * Number(matchingRule.price);
    }
    return Math.round(totalPrice);
};

function AssistantTypingIndicator() {
    return (
        <div className={styles.typingIndicator}>
            <div className={styles.botAvatar}><Bot size={14} /></div>
            <div className={styles.typingBubble}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
            </div>
        </div>
    );
}

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
    const [isLoading, setIsLoading] = useState(false);
    const [hasRestoredAI, setHasRestoredAI] = useState(false);

    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', content: AI_GREETING, createdAt: new Date().toISOString() }
    ]);

    // Booking form states
    const [bookingDate, setBookingDate] = useState('');
    const [paymentType, setPaymentType] = useState('DEPOSIT');
    const [selectedFieldId, setSelectedFieldId] = useState('');
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [pinnedWeatherData, setPinnedWeatherData] = useState(null);

    // Booking form modal
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [bookingModalData, setBookingModalData] = useState(null);
    const aiHistorySyncKeyRef = useRef('');
    const geoLocationRef = useRef(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const isOpenRef = useRef(isOpen);
    const activeRoomIdRef = useRef(activeRoom?.id || null);

    // Handlers to avoid inline arrow functions (Turbopack static flag issue)
    const handleCloseBookingModal = useCallback(() => {
        setBookingModalOpen(false);
    }, []);

    const handleOpenBookingModal = useCallback((data) => {
        setBookingModalData(data);
        setBookingModalOpen(true);
    }, []);

    const getBrowserLocation = useCallback(() => {
        if (geoLocationRef.current) return Promise.resolve(geoLocationRef.current);
        if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    geoLocationRef.current = location;
                    resolve(location);
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 5 * 60 * 1000 }
            );
        });
    }, []);

    const handleNewAiChat = useCallback(() => {
        const greeting = [{ role: 'assistant', content: AI_GREETING, createdAt: new Date().toISOString() }];
        const historyKey = serializeAiHistory(greeting);
        setAiMessages(greeting);
        aiHistorySyncKeyRef.current = historyKey;
        setSelectedSlots([]);
        setAvailableSlots([]);
        setBookingDate('');
        setSelectedFieldId('');
        setMessages(formatAiToWidgetMessages(greeting, user));
        try {
            sessionStorage.setItem(getAiHistoryKey(user?.id), JSON.stringify({ messages: greeting }));
            window.dispatchEvent(new CustomEvent('ai-history-updated', { detail: { messages: greeting, historyKey } }));
        } catch (error) {
            console.warn('Failed to reset AI chat:', error);
        }
    }, [user]);

    const EMOJIS = ['😂', '❤️', '🔥', '👍', '😍', '🥹', '😭', '🙏', '✨', '😅', '🤩', '🫶', '😎', '🤗', '🥳', '😤', '💪', '⚽'];

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        activeRoomIdRef.current = activeRoom?.id || null;
    }, [activeRoom]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = sessionStorage.getItem(getAiHistoryKey(user?.id));
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
                    setAiMessages(parsed.messages);
                    aiHistorySyncKeyRef.current = serializeAiHistory(parsed.messages);
                } else {
                    const greeting = [{ role: 'assistant', content: AI_GREETING, createdAt: new Date().toISOString() }];
                    setAiMessages(greeting);
                    aiHistorySyncKeyRef.current = serializeAiHistory(greeting);
                }
            } else {
                const greeting = [{ role: 'assistant', content: AI_GREETING, createdAt: new Date().toISOString() }];
                setAiMessages(greeting);
                aiHistorySyncKeyRef.current = serializeAiHistory(greeting);
            }
        } catch (error) {
            console.warn('Failed to restore AI chat history:', error);
        } finally {
            setHasRestoredAI(true);
        }
    }, [user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestoredAI) return;
        try {
            const historyKey = serializeAiHistory(aiMessages);
            if (aiHistorySyncKeyRef.current === historyKey) return;
            aiHistorySyncKeyRef.current = historyKey;
            sessionStorage.setItem(getAiHistoryKey(user?.id), JSON.stringify({ messages: aiMessages }));
            // Dispatch custom event for same-tab sync
            window.dispatchEvent(new CustomEvent('ai-history-updated', { detail: { messages: aiMessages, historyKey } }));
        } catch (error) {
            console.warn('Failed to persist AI chat history:', error);
        }
    }, [aiMessages, hasRestoredAI, user?.id]);

    // Listen for AI chat history updates from page (same-tab sync)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleAiHistoryUpdate = (e) => {
            try {
                const { messages, historyKey } = e.detail || {};
                if (!Array.isArray(messages)) return;
                if (historyKey && aiHistorySyncKeyRef.current === historyKey) return;
                if (historyKey) aiHistorySyncKeyRef.current = historyKey;
                if (Array.isArray(messages)) {
                    setAiMessages(messages);
                }
            } catch (error) {
                console.warn('Failed to sync AI chat history:', error);
            }
        };

        window.addEventListener('ai-history-updated', handleAiHistoryUpdate);
        return () => window.removeEventListener('ai-history-updated', handleAiHistoryUpdate);
    }, []);

    useEffect(() => {
        if (activeRoom?.id === ASSISTANT_ROOM_ID) {
            setMessages(formatAiToWidgetMessages(aiMessages, user));
            scrollToBottom();
        }
    }, [aiMessages, activeRoom?.id, user]);

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const loadRooms = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await chatAPI.getRooms();
            const rawRooms = res.data.data.rooms || [];
            const sortedRooms = rawRooms.sort((a, b) => {
                const timeA = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
                const timeB = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
                return timeB - timeA;
            });

            setRooms(sortedRooms);
        } catch (err) { console.error('Failed to load rooms:', err); }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !token || pathname === '/chat') return;

        const newSocket = createChatSocket(token);
        setSocket(newSocket);

        const stopListening = registerChatSocketHandlers(newSocket, {
            onMessageNotification: (data) => {
                if (!isOpenRef.current) {
                    setUnreadCount(p => p + 1);
                    setPopupMsg({
                        senderName: data.message.sender?.fullName || 'Ai đó',
                        content: data.message.type === 'IMAGE' ? '[Đã gửi 1 ảnh]' :
                            data.message.type === 'SYSTEM' ? '[Thông báo hệ thống]' : data.message.content
                    });
                    setTimeout(() => setPopupMsg(null), 5000);
                }
                loadRooms();
            },
            onNewMessage: (msg) => {
                if (activeRoomIdRef.current && msg.roomId === activeRoomIdRef.current) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    scrollToBottom();
                }
                loadRooms();
            },
        });

        return () => {
            stopListening();
            newSocket.disconnect();
        };
    }, [isAuthenticated, token, pathname, loadRooms]);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
           loadRooms();
           setUnreadCount(0);
           setPopupMsg(null);
        }
    }, [isOpen, isAuthenticated, loadRooms]);

    const selectRoom = async (room) => {
        setActiveRoom(room);
        if (room.id === ASSISTANT_ROOM_ID) {
            const formatted = formatAiToWidgetMessages(aiMessages, user);
            setMessages(formatted);
            scrollToBottom();
            return;
        }

        try {
            const { data } = await chatAPI.getMessages(room.id);
            setMessages(data.data.messages);
            scrollToBottom();
            if (socket) {
                joinChatRoom(socket, room.id);
                markChatRoomRead(socket, { roomId: room.id });
            }
        } catch (err) { console.error('Failed to load messages:', err); }
    };

    const insertEmoji = (e, emoji) => {
        e.preventDefault();
        setInput(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    };

    const sendToAssistant = async (text) => {
        const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
        const newAiMessages = [...aiMessages, userMsg];
        setAiMessages(newAiMessages);
        scrollToBottom();
        setIsLoading(true);

        try {
            const history = newAiMessages.slice(-10);
            const location = await getBrowserLocation();
            const outboundText = isWeatherQuery(text) ? buildWeatherCommand(location) : text;
            const res = await chatbotAPI.sendMessage(outboundText, history, location || undefined);
            const data = res.data.data;

            const botMsg = { 
                role: 'assistant', 
                content: data.message,
                toolResults: data.toolResults || [],
                type: 'TEXT',
                createdAt: new Date().toISOString(),
            };
            setAiMessages(prev => [...prev, botMsg]);
            scrollToBottom();
        } catch (err) {
            console.error('AI Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSlots = async (fieldId, date, formPayload) => {
        setIsLoadingSlots(true);
        try {
            const res = await bookingsAPI.getFieldSlots(fieldId, date);
            const bookedSlots = res.data?.data?.bookedSlots || res.data?.data?.slots || [];

            const formData = formPayload?.data || formPayload || {};
            const openStr = formData.openTime || '05:00';
            const closeStr = formData.closeTime || '22:00';

            let pricingRules = formData.pricingRules || [];
            if (formData.availableFields && selectedFieldId) {
                const matchedField = formData.availableFields.find((f) => f.id === selectedFieldId);
                if (matchedField?.pricingRules) pricingRules = matchedField.pricingRules;
            }

            const slots = [];
            const [openH, openM] = openStr.split(':').map(Number);
            const [closeH, closeM] = closeStr.split(':').map(Number);
            let current = openH * 60 + openM;
            let end = closeH * 60 + closeM;
            if (end <= current) end += 24 * 60;

            const dayOfWeek = new Date(date).getDay();

            while (current < end) {
                const h = Math.floor(current / 60) % 24;
                const m = current % 60;
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                const currentEnd = current + 30;

                const isBooked = bookedSlots.some((s) => {
                    const sStart = timeToMinutes(s.startTime);
                    const sEnd = timeToMinutes(s.endTime);
                    return Math.max(current, sStart) < Math.min(currentEnd, sEnd);
                });

                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const nowMinutes = today.getHours() * 60 + today.getMinutes();
                const isPast = date === todayStr && current < nowMinutes;

                const endH = Math.floor(currentEnd / 60) % 24;
                const endM = currentEnd % 60;
                const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                slots.push({
                    time: timeStr,
                    displayLabel: `${timeStr} - ${endTimeStr}`,
                    minutes: current,
                    booked: isBooked || isPast,
                    price: getSlotPrice(pricingRules, current, 30, dayOfWeek),
                });

                current += 30;
            }

            setAvailableSlots(slots);
        } catch (err) { console.error('Slot error', err); }
        finally { setIsLoadingSlots(false); }
    };

    const handleSlotClick = (slot) => {
        if (slot.booked) return;
        const nextSlot = availableSlots.find((s) => s.minutes === slot.minutes + 30 && !s.booked);
        const prevSlot = availableSlots.find((s) => s.minutes === slot.minutes - 30 && !s.booked);

        let picked = [];
        if (nextSlot) {
            picked = [slot, nextSlot];
        } else if (prevSlot) {
            picked = [prevSlot, slot];
        }

        if (picked.length !== 2) {
            setSelectedSlots([]);
            return;
        }

        setSelectedSlots(picked.sort((a, b) => a.minutes - b.minutes));
    };

    const handleBookingSubmit = async (fieldId) => {
        if (selectedSlots.length !== 2) return;
        const startTime = selectedSlots[0].time;
        const endTime = selectedSlots[1].displayLabel.split(' - ')[1];
        await sendToAssistant(`Xác nhận đặt sân ${fieldId} vào ngày ${bookingDate} từ ${startTime} đến ${endTime} với phương thức ${paymentType}`);
        setSelectedSlots([]);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeRoom) return;
        const content = input.trim();
        setInput('');

        if (activeRoom.id === ASSISTANT_ROOM_ID) {
            sendToAssistant(content);
            return;
        }

        const tempMsg = {
            id: `temp-${Date.now()}`,
            roomId: activeRoom.id,
            senderId: user.id,
            content,
            createdAt: new Date().toISOString(),
            sender: user,
            type: 'TEXT'
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        if (socket) {
            sendChatMessage(socket, { roomId: activeRoom.id, content, type: 'TEXT' });
        }
        loadRooms();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom || activeRoom.id === ASSISTANT_ROOM_ID || !socket) return;
        try {
            const res = await uploadAPI.single(file);
            const imageUrl = res.data.data.url;
            sendChatMessage(socket, { roomId: activeRoom.id, content: imageUrl, type: 'IMAGE' });
            loadRooms();
        } catch (err) { console.error('Upload fail', err); }
    };

    const getOtherUser = (room) => {
        if (room.id === ASSISTANT_ROOM_ID) return { fullName: 'Trợ lý SportApp', role: 'BOT' };
        return room.members?.find(m => m.user.id !== user?.id)?.user || {};
    };

    useEffect(() => {
        if (bookingDate && activeRoom?.id === ASSISTANT_ROOM_ID) {
            const activeForm = messages.find(m => m.toolResults?.some(r => r.type === 'booking_form'))
                ?.toolResults?.find(r => r.type === 'booking_form');
            if (activeForm) {
                const targetFieldId = selectedFieldId || activeForm?.data?.fieldId || activeForm?.fieldId;
                if (!targetFieldId) return;
                fetchSlots(targetFieldId, bookingDate, activeForm);
                setSelectedSlots([]);
            }
        }
    }, [bookingDate, selectedFieldId, activeRoom?.id, messages]);

    useEffect(() => {
        if (activeRoom?.id !== ASSISTANT_ROOM_ID) return;

        let cancelled = false;
        let intervalId = null;

        const fetchPinnedWeather = async () => {
            try {
                const location = await getBrowserLocation();
                const command = buildWeatherCommand(location);
                const res = await chatbotAPI.sendMessage(command, [], location || undefined);
                const weatherTool = (res.data?.data?.toolResults || []).find(t => t.type === 'weather');
                if (!cancelled && weatherTool?.data) {
                    setPinnedWeatherData(weatherTool.data);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('Failed to refresh widget weather:', error?.message || error);
                }
            }
        };

        fetchPinnedWeather();
        intervalId = setInterval(fetchPinnedWeather, 15 * 60 * 1000);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeRoom?.id, getBrowserLocation]);

    if (pathname === '/chat' || !isAuthenticated) return null;

    const isAssistant = activeRoom?.id === ASSISTANT_ROOM_ID;

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
                                    {isAssistant ? <div className={styles.botAvatar}><Bot size={18} /></div> : <Avatar user={getOtherUser(activeRoom)} size="sm" />}
                                    <span className={styles.headerName}>{getOtherUser(activeRoom).fullName}</span>
                                </div>
                                {isAssistant && (
                                    <button className={styles.newChatBtn} onClick={handleNewAiChat} title="Tạo chat mới">
                                        Mới
                                    </button>
                                )}
                            </>
                        ) : (
                            <h3 className={styles.headerTitle}>Tin nhắn</h3>
                        )}
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {isAssistant && pinnedWeatherData && (
                        <div className={styles.pinnedWeatherWrapFixed}>
                            <ChatCardRenderer
                                type="weather"
                                data={pinnedWeatherData}
                                onAction={sendToAssistant}
                                isLoading={false}
                                isWidgetContext={true}
                            />
                        </div>
                    )}

                    <div className={styles.chatBody}>
                        {!activeRoom ? (
                            <div className={styles.roomList}>
                                <div className={styles.roomItem} onClick={() => selectRoom({ id: ASSISTANT_ROOM_ID })}>
                                    <div className={styles.botAvatar}><Bot size={20} /></div>
                                    <div className={styles.roomInfo}>
                                        <div className={styles.roomName}>Trợ lý SportApp</div>
                                        <div className={styles.roomPreview}>AI Assistant sẵn sàng giúp đỡ</div>
                                    </div>
                                </div>
                                {rooms.map(room => {
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
                                                        room.lastMessage.type === 'SYSTEM' ? 'Thông báo hệ thống' :
                                                        room.lastMessage.content
                                                    ) : 'Bắt đầu trò chuyện'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.messageList}>
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderId === user?.id;
                                    const isBot = msg.senderId === 'bot';
                                    const isStructuredSystem = msg.type === 'SYSTEM' && typeof msg.content === 'string' && msg.content.trim().startsWith('{');
                                    const shouldRenderTextBubble = msg.type !== 'SYSTEM' || !isStructuredSystem;
                                    const systemPayload = (() => {
                                        if (msg.type !== 'SYSTEM' || typeof msg.content !== 'string') return {};
                                        try {
                                            return msg.content.startsWith('{') ? JSON.parse(msg.content) : {};
                                        } catch {
                                            return {};
                                        }
                                    })();
                                    return (
                                        <div key={msg.id || idx} className={`${styles.messageRow} ${isOwn ? styles.ownRow : styles.otherRow}`}>
                                            {(!isOwn && !isBot) && <Avatar user={msg.sender} size="xs" />}
                                            {isBot && <div className={styles.msgAvatarBot}><Bot size={14} /></div>}
                                            <div className={styles.bubbleCol}>
                                                {shouldRenderTextBubble && (
                                                    <div className={[
                                                        styles.messageBubble,
                                                        isOwn ? styles.ownBubble : styles.otherBubble,
                                                        msg.type === 'IMAGE' ? styles.imageBubble : ''
                                                    ].join(' ')}>
                                                        {msg.type === 'IMAGE' ? (
                                                            <img src={getImageUrl(msg.content)} alt="Attached" className={styles.msgImage} />
                                                        ) : (
                                                            msg.content
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {(msg.toolResults || (msg.type === 'SYSTEM')) && (
                                                    <div className={styles.richContentArea}>
                                                        {msg.type === 'SYSTEM' ? (
                                                            <ChatCardRenderer 
                                                                messageId={msg.id}
                                                                data={systemPayload}
                                                                onAction={(action, payload) => {
                                                                    if (isAssistant) {
                                                                        sendToAssistant(action);
                                                                    } else {
                                                                        if (action === 'ACCEPT_VENUE_SUGGESTION') {
                                                                            chatAPI.acceptVenueSuggestion(payload || msg.id)
                                                                                .catch(() => alert('Không thể đồng ý gợi ý sân này.'));
                                                                        } else
                                                                        if (action === 'VIEW_MATCH_DETAILS') {
                                                                            window.location.href = `/matchmaking?post=${payload}`;
                                                                        } else if (action === 'JOIN_MATCH') {
                                                                            matchmakingAPI.sendRequest(payload)
                                                                                .then(() => alert("Đã gửi yêu cầu tham gia thành công!"))
                                                                                .catch(e => alert(e.response?.data?.message || "Không thể tham gia."));
                                                                        } else if (action.startsWith('BOOK_VENUE:')) {
                                                                            const vid = action.split(':')[1].trim();
                                                                            window.location.href = `/venues/${vid}`;
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            msg.toolResults.map((res, ri) => (
                                                                <ChatCardRenderer 
                                                                    key={ri} 
                                                                    type={res.type} 
                                                                    data={res.data} 
                                                                    isLoading={isLoading}
                                                                    onAction={sendToAssistant}
                                                                    isWidgetContext={true}
                                                                    onOpenBookingModal={handleOpenBookingModal}
                                                                    bookingFormStates={{
                                                                        bookingDate, setBookingDate,
                                                                        paymentType, setPaymentType,
                                                                        selectedFieldId, setSelectedFieldId,
                                                                        selectedSlots, handleSlotClick,
                                                                        availableSlots, isLoadingSlots,
                                                                        handleBookingSubmit
                                                                    }}
                                                                />
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isLoading && activeRoom?.id === ASSISTANT_ROOM_ID && <AssistantTypingIndicator />}
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
                                    <Smile size={20} />
                                </button>
                                <input 
                                    ref={inputRef}
                                    value={input} 
                                    onChange={e => setInput(e.target.value)} 
                                    placeholder="Nhập tin nhắn..." 
                                    className={styles.chatInput}
                                    onClick={() => setShowEmoji(false)}
                                    disabled={isLoading}
                                />
                                {!isAssistant && (
                                    <>
                                        <button type="button" className={styles.iconBtn} title="Gửi ảnh" onClick={() => fileInputRef.current?.click()}>
                                            <ImageIcon size={20} />
                                        </button>
                                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                                    </>
                                )}
                                <button type="submit" className={styles.sendBtn} disabled={!input.trim() || isLoading}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
            
            {!isOpen && (
                <button className={styles.fab} onClick={() => setIsOpen(true)}>
                    <MessageCircle fill="#FF6E40" size={32} strokeWidth={1.5} />
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
            )}

            {/* Booking Form Modal */}
            {bookingModalOpen && (
                <BookingFormModal
                    isOpen={bookingModalOpen}
                    onClose={handleCloseBookingModal}
                    data={bookingModalData}
                    onAction={sendToAssistant}
                    isLoading={isLoading}
                    bookingFormStates={{
                        bookingDate, setBookingDate,
                        paymentType, setPaymentType,
                        selectedFieldId, setSelectedFieldId,
                        selectedSlots, handleSlotClick,
                        availableSlots, isLoadingSlots,
                        handleBookingSubmit
                    }}
                />
            )}
        </div>
    );
}
