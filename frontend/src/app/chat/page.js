'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { ChevronDown, Send, X, Maximize2, Minimize2, MapPin, CheckCheck } from 'lucide-react';
import { chatbotAPI, bookingsAPI, getImageUrl } from '@/lib/api';
import BotToolResults from '@/components/chat/BotToolResults';
import ChatCardRenderer from '@/components/chat/ChatCardRenderer';
import ChatComposer from '@/components/chat/ChatComposer';
import styles from './chat.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// --- Helper Functions (Replicated from VenueDetail) ---
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
        const matchingRule = pricingRules.find(r => !r.dayOfWeek || r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek));
        if (matchingRule) totalPrice = (slotDurationMinutes / 60) * Number(matchingRule.price);
    }
    return Math.round(totalPrice);
};

const CHATBOT_ID = 'sportapp-ai';
const CHAT_STATE_STORAGE_KEY = 'sportapp-chat-page-state-v1';
const getChatStateKey = (userId) => `${CHAT_STATE_STORAGE_KEY}-${userId || 'guest'}`;
const getAiHistoryKey = (userId) => `sportapp-ai-chat-history-v2-${userId || 'guest'}`;
const EMOJIS = ['😀', '😂', '😍', '😎', '🤝', '🔥', '⚽', '🏸', '🎾', '🏀', '👍', '❤️'];
const AI_GREETING = 'Xin chào! Tôi là trợ lý ảo SportApp. Tôi có thể giúp gì cho bạn hôm nay?';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const WEATHER_QUERY_REGEX = /(thoi tiet|thời tiết|du bao|dự báo|mua khong|mưa không|co mua khong|có mưa không|nang|nắng|gio|gió|weather)/i;

const isWeatherQuery = (text = '') => WEATHER_QUERY_REGEX.test(text);

const buildWeatherCommand = (location) => {
    if (location?.lat && location?.lng) {
        return `get_weather lat=${location.lat} lon=${location.lng}`;
    }
    return 'get_weather';
};

const toChatbotUiMessages = (aiMessages = []) => {
    if (!Array.isArray(aiMessages)) return [];
    return aiMessages.map((m, idx) => {
        const createdAt = m.createdAt || new Date().toISOString();
        const time = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (m.role === 'user') {
            return {
                id: m.id || `ai-user-${idx}`,
                type: 'outgoing',
                isOutgoing: true,
                text: m.content || '',
                time,
                createdAt,
            };
        }
        return {
            id: m.id || `ai-assistant-${idx}`,
            type: 'incoming',
            isOutgoing: false,
            text: m.content || '',
            time,
            isBot: true,
            createdAt,
            data: {
                message: m.content || '',
                toolResults: m.toolResults || [],
            },
        };
    });
};

const toAiTranscriptFromUiMessages = (uiMessages = []) => {
    if (!Array.isArray(uiMessages)) return [];
    return uiMessages.map((m, idx) => {
        if (m.isOutgoing) {
            return {
                id: m.id || `ai-user-${idx}`,
                role: 'user',
                content: m.text || '',
                createdAt: m.createdAt || new Date().toISOString(),
            };
        }
        return {
            id: m.id || `ai-assistant-${idx}`,
            role: 'assistant',
            content: m.text || '',
            toolResults: m.data?.toolResults || [],
            createdAt: m.createdAt || new Date().toISOString(),
        };
    });
};

const serializeAiHistory = (messages = []) => JSON.stringify(
    messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolResults: m.toolResults || [],
    }))
);

/* ─── Icons ─── */
const BotIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
);

/* ─── Avatar Component ─── */
function Avatar({ conv, size = 46 }) {
    const avatarSrc = getImageUrl(conv?.avatar);
    const isBot = conv?.type === 'bot' || conv?.id === CHATBOT_ID;

    return (
        <div
            className={styles.avatarImg}
            style={{
                width: size, height: size,
                background: conv?.avatarGradient || '#ccc',
                fontSize: size * 0.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isBot ? 'white' : 'inherit'
            }}
        >
            {avatarSrc ? (
                <img src={avatarSrc} alt={conv?.name || 'Avatar'} />
            ) : isBot ? (
                <BotIcon size={size * 0.55} />
            ) : (
                conv?.initials || ''
            )}
        </div>
    );
}

/* ─── Conversation Item ─── */
function ConvItem({ conv, active, onClick }) {
    return (
        <button
            className={`${styles.convItem} ${active ? styles.activeConv : ''}`}
            onClick={onClick}
        >
            <div className={styles.convAvatar}>
                <Avatar conv={conv} />
                {conv.online && <span className={styles.onlineDot} />}
            </div>
            <div className={styles.convBody}>
                <div className={styles.convTopRow}>
                    <span className={styles.convName}>{conv.name}</span>
                    <span className={styles.convTime}>{conv.time}</span>
                </div>
                <div className={styles.convBottomRow}>
                    <span className={`${styles.convPreview} ${conv.unread ? styles.unread : ''}`}>
                        {conv.lastMsg}
                    </span>
                    {conv.unread > 0 && (
                        <span className={styles.unreadBadge}>{conv.unread}</span>
                    )}
                </div>
            </div>
        </button>
    );
}

/* ─── Message Bubble ─── */
function MessageBubble({ 
    msg, conv, onAction, onSend, isBotLoading,
    // Bot Tool Props
    bookingStates, bookingHandlers
}) {
    const isSystem = msg.type === 'system' || msg.type === 'SYSTEM';
    const isOut = msg.isOutgoing; // Use new flag for positioning
    const isImageMessage =
        msg.originalType === 'IMAGE' ||
        /^\/uploads\//i.test(msg.text || '') ||
        /^https?:\/\/.*\/uploads\//i.test(msg.text || '');

    const imageSrc = isImageMessage
        ? getImageUrl(msg.text)
        : null;

    if (isSystem) {
        let data = {};
        try {
            data = JSON.parse(msg.text);
        } catch (e) {
            return (
                <div className={styles.systemMessage}>
                    <span className={styles.systemBadge}>{msg.text}</span>
                </div>
            );
        }

        if (data.action === 'MATCH_INIT') return null;

        return (
            <div className={`${styles.systemCardWrapper} ${data.action === 'VENUE_SUGGEST' ? (isOut ? styles.systemCardOutgoing : styles.systemCardIncoming) : styles.systemCardCentered}`}>
                <ChatCardRenderer
                    data={data}
                    messageId={msg.id}
                    onAction={(act, payload) => onAction('SYSTEM_CARD_ACTION', { action: act, payload, messageId: msg.id })}
                />
            </div>
        );
    }

    return (
        <div className={styles.messageGroup}>
            {msg.isVenueTag && (
                <div className={styles.messageBubbleWrapper}>
                    <Avatar conv={{ ...conv, type: 'bot' }} size={28} />
                    <div>
                        <div className={`${styles.venueTag} ${styles.incoming}`}>
                            <MapPin size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> {msg.venueName}
                        </div>
                        <div className={`${styles.bubble} ${styles.incoming}`}>
                            {msg.text}
                        </div>
                        <div className={styles.bubbleTime}>{msg.time}</div>
                    </div>
                </div>
            )}
            {!msg.isVenueTag && (
                <div className={`${styles.messageBubbleWrapper} ${isOut ? styles.outgoing : ''}`}>
                    {!isOut && (
                        <div className={styles.bubbleAvatarWrapper}>
                            <Avatar conv={conv} size={28} />
                        </div>
                    )}
                    <div className={`${styles.bubbleContainer} ${isOut ? styles.outgoing : ''}`}>
                        <div className={`${styles.bubble} ${isOut ? styles.outgoing : styles.incoming} ${msg.isBot ? styles.msgBubbleBot : ''} ${isImageMessage ? styles.bubbleImage : ''}`}>
                            {isImageMessage ? (
                                <img
                                    src={imageSrc}
                                    className={styles.messageImage}
                                    alt="Sent content"
                                    onClick={() => window.open(imageSrc, '_blank')}
                                />
                            ) : (
                                msg.text
                            )}
                        </div>
                        {msg.isBot && msg.data && (
                            <BotToolResults 
                                toolResults={msg.data.toolResults} 
                                onSend={onSend}
                                isBotLoading={isBotLoading}
                                {...bookingStates}
                                {...bookingHandlers}
                            />
                        )}
                        <div className={`${styles.bubbleTime} ${isOut ? styles.outgoing : ''}`}>
                            {msg.time}
                            {isOut && msg.read && <CheckCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginLeft: 4 }} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Bot Typing Indicator ─── */
function BotTypingIndicator() {
    return (
        <div className={styles.typingIndicator}>
            <div className={styles.typingBubble}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
            </div>
        </div>
    );
}

/* ─── Empty Chat State ─── */
function EmptyChatState() {
    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                        stroke="url(#chatGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <defs>
                        <linearGradient id="chatGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF6E40" />
                            <stop offset="1" stopColor="#D81B60" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <h3 className={styles.emptyTitle}>Chọn cuộc trò chuyện</h3>
            <p className={styles.emptySubtitle}>
                Kết nối với bạn bè, đồng đội hoặc chủ sân để lên kế hoạch chơi thể thao.
            </p>
        </div>
    );
}

/* ─── Icons ─── */
/* ── Match Banner ── */
function MatchBanner({ info, roomType, onSuggest }) {
    if (roomType !== 'MATCH_GROUP') return null;
    
    if (!info) {
        return (
            <div className={styles.matchBanner}>
                <div className={styles.matchInfo}>
                    <div className={styles.matchTitle}>Đang tải thông tin trận đấu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.matchBanner}>
            <div className={styles.matchInfo}>
                <div className={styles.matchTitle}>Trận {info.sportType} – {new Date(info.bookingDate).toLocaleDateString('vi-VN')}</div>
                <div className={styles.matchMeta}>
                    <div className={styles.matchMetaItem}>
                        <ClockIcon /> {info.startTime} - {info.endTime}
                    </div>
                    <div className={styles.matchMetaItem}>
                        <PinIcon /> {info.city}{info.district ? `, ${info.district}` : ''}
                    </div>
                </div>
            </div>
            <button className={styles.suggestBtn} onClick={onSuggest}>
                <SuggestIcon /> Gợi ý sân
            </button>
        </div>
    );
}

/* ── Venue Selection Modal ── */
function VenueSelectionModal({ isOpen, onClose, venues, onSelect }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Gợi ý sân phù hợp</h3>
                    <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    {venues.length === 0 && <div style={{padding: '40px', textAlign: 'center', color: '#6B7280'}}>Không tìm thấy sân phù hợp...</div>}
                    {venues.map(v => (
                        <div key={v.id} className={styles.modalVenueItem} onClick={() => onSelect(v)}>
                            <img src={getImageUrl(v.images?.[0]) || 'https://via.placeholder.com/64'} className={styles.modalVenueThumb} alt={v.name} />
                            <div className={styles.modalVenueInfo}>
                                <div className={styles.modalVenueName}>{v.name}</div>
                                <div className={styles.modalVenueAddr}>{v.address}</div>
                                <div className={styles.venueCardPrice}>~{Number(v.minPrice || 0).toLocaleString()}đ</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Icons ─── */
const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
);

const PinIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', filter: 'none'}}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);

const SuggestIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>
    </svg>
);

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from '@/lib/auth';

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
function ChatApp() {
    const { user } = useAuth();
    const [activeConvId, setActiveConvId] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState({});
    const [conversations, setConversations] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [typingByRoom, setTypingByRoom] = useState({});
    const [isBotLoading, setIsBotLoading] = useState(false);
    const [botHistory, setBotHistory] = useState([]);
    const [showEmoji, setShowEmoji] = useState(false);
    
    const [matchInfo, setMatchInfo] = useState(null);
    const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
    const [suggestedVenues, setSuggestedVenues] = useState([]);
    const [isLoadingVenues, setIsLoadingVenues] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());
    
    const messagesEndRef = useRef(null);
    const composeRef = useRef(null);
    const fileInputRef = useRef(null);
    const socketRef = useRef(null);
    const myIdRef = useRef(user?.id || null);
    const activeConvIdRef = useRef(activeConvId);
    const typingTimeoutsRef = useRef({});
    const lastTypingEmitRef = useRef(0);
    const geoLocationRef = useRef(null);
    const lastHandledTargetUserIdRef = useRef(null);

    // Ensure myIdRef is always up to date with the authenticated user
    useEffect(() => {
        if (user?.id) {
            myIdRef.current = user.id;
        }
    }, [user?.id]);

    useEffect(() => {
        activeConvIdRef.current = activeConvId;
    }, [activeConvId]);

    const activeConv = conversations.find(c => c.id === activeConvId);
    const currentMsgs = activeConvId ? (messages[activeConvId] || []) : [];
    const isTyping = activeConvId ? Boolean(typingByRoom[activeConvId]) : false;

    useEffect(() => {
        return () => {
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
        };
    }, []);

    const filteredConvs = conversations.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === 'venues') return matchSearch && c.type === 'venue';
        if (activeTab === 'users') return matchSearch && c.type === 'user';
        return matchSearch;
    }).map(c => ({
        ...c,
        online: c.type === 'bot' || (c.targetUserId && onlineUserIds.has(c.targetUserId))
    }));

    const botConvs = filteredConvs.filter(c => c.type === 'bot');
    const userConvs = filteredConvs.filter(c => c.type === 'user');
    const venueConvs = filteredConvs.filter(c => c.type === 'venue');

    const searchParams = useSearchParams();
    const targetUserId = searchParams.get('user');

    // --- Chatbot Specific States ---
    const [bookingDate, setBookingDate] = useState('');
    const [paymentType, setPaymentType] = useState('DEPOSIT');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    const [pinnedWeatherData, setPinnedWeatherData] = useState(null);
    const [hasRestoredChatState, setHasRestoredChatState] = useState(false);
    const aiHistorySyncKeyRef = useRef('');

    // Reset all chat state when user changes (e.g. logout/login in same tab)
    useEffect(() => {
        setMessages({});
        setActiveConvId(CHATBOT_ID);
        setConversations([]);
        setBotHistory([]);
        setHasRestoredChatState(false);
    }, [user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stateKey = getChatStateKey(user?.id);
            const historyKey = getAiHistoryKey(user?.id);

            const raw = sessionStorage.getItem(stateKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.activeConvId) setActiveConvId(parsed.activeConvId);
            } else {
                // Reset if no state for this user
                setActiveConvId(CHATBOT_ID);
            }

            const aiHistoryRaw = sessionStorage.getItem(historyKey);
            if (aiHistoryRaw) {
                const aiHistoryParsed = JSON.parse(aiHistoryRaw);
                if (Array.isArray(aiHistoryParsed?.messages)) {
                    const transcript = aiHistoryParsed.messages;
                    setBotHistory(transcript);
                    setMessages(prev => ({ ...prev, [CHATBOT_ID]: toChatbotUiMessages(transcript) }));
                    aiHistorySyncKeyRef.current = serializeAiHistory(transcript);
                }
            } else {
                // Reset bot history if no history for this user
                const greeting = [{ role: 'assistant', content: AI_GREETING, createdAt: new Date().toISOString() }];
                setBotHistory(greeting);
                setMessages(prev => ({ ...prev, [CHATBOT_ID]: toChatbotUiMessages(greeting) }));
                aiHistorySyncKeyRef.current = serializeAiHistory(greeting);
            }
        } catch (error) {
            console.warn('Failed to restore chat page state:', error);
        } finally {
            setHasRestoredChatState(true);
        }
    }, [user?.id]);

    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestoredChatState) return;

        const chatbotUiMessages = messages[CHATBOT_ID] || [];
        const transcript = chatbotUiMessages.length > 0
            ? toAiTranscriptFromUiMessages(chatbotUiMessages)
            : botHistory;
        const historyKey = serializeAiHistory(transcript);

        if (aiHistorySyncKeyRef.current === historyKey) return;
        aiHistorySyncKeyRef.current = historyKey;

        const payload = {
            activeConvId,
            botMessages: chatbotUiMessages,
        };

        try {
            sessionStorage.setItem(getChatStateKey(user?.id), JSON.stringify(payload));
            sessionStorage.setItem(getAiHistoryKey(user?.id), JSON.stringify({ messages: transcript }));
            // Dispatch custom event for same-tab sync
            window.dispatchEvent(new CustomEvent('ai-history-updated', { detail: { messages: transcript, historyKey } }));
        } catch (error) {
            console.warn('Failed to persist chat page state:', error);
        }
    }, [activeConvId, botHistory, messages, hasRestoredChatState, user?.id]);

    // Listen for AI chat history updates from widget (same-tab sync)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleAiHistoryUpdate = (e) => {
            try {
                const { messages, historyKey } = e.detail || {};
                if (!Array.isArray(messages)) return;
                if (historyKey && aiHistorySyncKeyRef.current === historyKey) return;
                if (historyKey) aiHistorySyncKeyRef.current = historyKey;
                if (Array.isArray(messages)) {
                    setBotHistory(messages);
                    setMessages(prev => ({ ...prev, [CHATBOT_ID]: toChatbotUiMessages(messages) }));
                }
            } catch (error) {
                console.warn('Failed to sync AI chat history:', error);
            }
        };

        window.addEventListener('ai-history-updated', handleAiHistoryUpdate);
        return () => window.removeEventListener('ai-history-updated', handleAiHistoryUpdate);
    }, []);

    // Fetch available slots when date or field changes in the form
    useEffect(() => {
        const fetchSlots = async () => {
            if (!activeConv || activeConv.id !== CHATBOT_ID) return;
            
            const lastMsg = currentMsgs[currentMsgs.length - 1];
            const currentForm = lastMsg?.data?.toolResults?.find(r => r.type === 'booking_form');
            
            if (currentForm && bookingDate) {
                const targetFieldId = selectedFieldId || currentForm.data.fieldId;
                const { openTime, closeTime, availableFields } = currentForm.data;
                
                let pricingRules = currentForm.data.pricingRules;
                if (availableFields && selectedFieldId) {
                    const matchedField = availableFields.find(f => f.id === selectedFieldId);
                    if (matchedField) pricingRules = matchedField.pricingRules;
                }

                setIsLoadingSlots(true);
                try {
                    const res = await bookingsAPI.getFieldSlots(targetFieldId, bookingDate);
                    const bookedSlots = res.data.data.bookedSlots || [];

                    const openStr = openTime || '05:00';
                    const closeStr = closeTime || '22:00';
                    const slots = [];
                    const [openH, openM] = openStr.split(':').map(Number);
                    const [closeH, closeM] = closeStr.split(':').map(Number);
                    let current = openH * 60 + openM;
                    let end = closeH * 60 + closeM;
                    if (end <= current) end += 24 * 60;

                    const dayOfWeek = new Date(bookingDate).getDay();

                    while (current < end) {
                        const h = Math.floor(current / 60) % 24;
                        const m = current % 60;
                        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                        const currentEnd = current + 30;

                        const isBooked = bookedSlots.some(s => {
                            const sStart = timeToMinutes(s.startTime);
                            const sEnd = timeToMinutes(s.endTime);
                            return Math.max(current, sStart) < Math.min(currentEnd, sEnd);
                        });

                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const nowMinutes = today.getHours() * 60 + today.getMinutes();
                        const isPast = bookingDate === todayStr && current < nowMinutes;

                        const endH = Math.floor(currentEnd / 60) % 24;
                        const endM = currentEnd % 60;
                        const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                        slots.push({
                            time: timeStr,
                            displayLabel: `${timeStr} - ${endTimeStr}`,
                            minutes: current,
                            booked: isBooked || isPast,
                            price: getSlotPrice(pricingRules, current, 30, dayOfWeek)
                        });
                        current += 30;
                    }
                    setAvailableSlots(slots);
                } catch (error) {
                    console.error("Failed to load slots:", error);
                } finally {
                    setIsLoadingSlots(false);
                }
            }
        };

        if (bookingDate) {
            fetchSlots();
            setSelectedSlots([]);
        }
    }, [bookingDate, currentMsgs, selectedFieldId, activeConv]);

    // Handle Auto-fill from Tool Results
    useEffect(() => {
        if (!activeConv || activeConv.id !== CHATBOT_ID || currentMsgs.length === 0) return;
        const lastMsg = currentMsgs[currentMsgs.length - 1];
        if (lastMsg.isBot && lastMsg.data?.toolResults) {
            const formResult = lastMsg.data.toolResults.find(r => r.type === 'booking_form');
            if (formResult?.data?.currentArgs) {
                const args = formResult.data.currentArgs;
                if (args.bookingDate) setBookingDate(args.bookingDate);
                if (args.paymentType) setPaymentType(args.paymentType);
                if (args.fieldId) setSelectedFieldId(args.fieldId);
            }
        }
    }, [currentMsgs, activeConv]);

    const handleSlotClick = (slot) => {
        if (slot.booked) return;
        const nextSlot = availableSlots.find(s => s.minutes === slot.minutes + 30 && !s.booked);
        const prevSlot = availableSlots.find(s => s.minutes === slot.minutes - 30 && !s.booked);

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
        const lastSlot = selectedSlots[selectedSlots.length - 1];
        const endTime = lastSlot.displayLabel.split(' - ')[1];
        const command = `create_booking fieldId=${fieldId} bookingDate=${bookingDate} startTime=${startTime} endTime=${endTime} paymentType=${paymentType}`;
        
        setBookingDate('');
        setSelectedFieldId(null);
        setSelectedSlots([]);
        setAvailableSlots([]);
        
        // Use the existing sendMessage logic
        handleSend(command);
    };

    // Auto scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMsgs, activeConvId]);

    // Prettify SYSTEM messages for sidebar preview
    const formatLastMsg = (content, type) => {
        if (!content) return 'Bắt đầu cuộc trò chuyện...';
        if (type !== 'SYSTEM' && type !== 'system') return content;
        try {
            const data = JSON.parse(content);
            if (data.action === 'VENUE_SUGGEST') return `Gợi ý: ${data.venueName}`;
            if (data.action === 'VENUE_ACCEPT') return `Đã chốt sân: ${data.venueName}`;
            if (data.action === 'MATCH_INIT') return `Ghép trận ${data.sportType}`;
            return 'Thông báo hệ thống';
        } catch (e) {
            return content;
        }
    };

    // Handle incoming chat request from URL ?user=
    useEffect(() => {
        if (targetUserId && user?.id) {
            // Only handle if it's a NEW targetUserId or we haven't successfully switched yet
            if (lastHandledTargetUserIdRef.current === targetUserId) return;

            const existing = conversations.find(c => c.targetUserId === targetUserId);
            if (existing) {
                setActiveConvId(existing.id);
                lastHandledTargetUserIdRef.current = targetUserId;
            } else {
                import('@/lib/api').then(async ({ usersAPI, chatAPI }) => {
                    try {
                        const [userRes, roomRes] = await Promise.all([
                            usersAPI.getPublicProfile(targetUserId),
                            chatAPI.createRoom(targetUserId)
                        ]);
                        const u = userRes.data.data.user;
                        const room = roomRes.data.data.room;
                        const roomId = room.id;

                        const msgsRes = await chatAPI.getMessages(roomId);
                        const msgsList = msgsRes.data?.data?.messages || [];
                        const lastM = msgsList.length > 0 ? msgsList[msgsList.length - 1] : null;

                        const isVenue = u.role === 'OWNER';
                        const newConv = {
                            id: roomId, type: isVenue ? 'venue' : 'user',
                            roomType: room.type, 
                            name: u.fullName,
                            avatar: u.avatarUrl,
                            initials: u.fullName.charAt(0).toUpperCase(),
                            lastMsg: formatLastMsg(lastM?.content, lastM?.type),
                            time: lastM ? new Date(lastM.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
                            unread: 0, online: true,
                            avatarGradient: isVenue ? 'linear-gradient(135deg, #0066FF, #5E5CE6)' : 'linear-gradient(135deg, #FF6E40, #D81B60)',
                            targetUserId: targetUserId,
                            isReal: true
                        };

                        const formattedMsgs = msgsList.map(m => ({
                            id: m.id,
                            type: m.type === 'SYSTEM' ? 'system' : (m.senderId === user.id ? 'outgoing' : 'incoming'),
                            isOutgoing: m.senderId === user.id,
                            originalType: m.type,
                            text: m.content,
                            data: m.type === 'SYSTEM' ? (() => { try { return JSON.parse(m.content); } catch(e) { return null; } })() : null,
                            time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            read: m.isRead
                        }));

                        setConversations(prev => [newConv, ...prev.filter(c => c.id !== roomId)]);
                        setMessages(prev => ({ ...prev, [roomId]: formattedMsgs }));
                        setActiveConvId(roomId);
                        lastHandledTargetUserIdRef.current = targetUserId;
                    } catch (err) {
                        console.error('Failed to init real chat', err);
                    }
                });
            }
        }
    }, [targetUserId, conversations, user?.id]);

    // Initialize socket connection (ONCE)
    useEffect(() => {
        const token = localStorage.getItem('sportapp_token');
        if (!token) return;

        // Ensure myIdRef is set before socket operations
        if (user?.id) myIdRef.current = user.id;

        const socket = io(SERVER_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on('new_message', (m) => {
            handleIncomingMessage(m);
        });

        socket.on('message_notification', (data) => {
            handleIncomingMessage(data.message);
        });

        socket.on('user_typing', (payload) => {
            const roomId = payload?.roomId;
            if (!roomId || payload?.userId === myIdRef.current) return;

            setTypingByRoom(prev => ({ ...prev, [roomId]: true }));

            if (typingTimeoutsRef.current[roomId]) {
                clearTimeout(typingTimeoutsRef.current[roomId]);
            }

            typingTimeoutsRef.current[roomId] = setTimeout(() => {
                setTypingByRoom(prev => ({ ...prev, [roomId]: false }));
            }, 2600);
        });

        socket.on('all_messages_read', (data) => {
            setConversations(prev => prev.map(c => {
                if (c.id === data.roomId) {
                    return { ...c, unread: 0 };
                }
                return c;
            }));
        });

        socket.on('online_users', (ids) => {
            setOnlineUserIds(new Set(ids));
        });

        socket.on('user_online', ({ userId }) => {
            setOnlineUserIds(prev => new Set([...prev, userId]));
        });

        socket.on('user_offline', ({ userId }) => {
            setOnlineUserIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        function handleIncomingMessage(m) {
            setMessages(prev => {
                const arr = prev[m.roomId] || [];
                // CRITICAL: Avoid duplicate messages
                if (arr.some(old => old.id === m.id)) return prev;

                const isOutgoing = m.senderId === myIdRef.current;
                const newMsg = {
                    id: m.id,
                    type: m.type === 'SYSTEM' ? 'system' : (isOutgoing ? 'outgoing' : 'incoming'),
                    isOutgoing: isOutgoing, // Added explicit flag for positioning
                    originalType: m.type,
                    text: m.content,
                    data: m.type === 'SYSTEM' ? (() => { try { return JSON.parse(m.content); } catch(e) { return null; } })() : null,
                    time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    read: m.isRead
                };

                // If it's a SYSTEM message in the active room, check for UI updates
                if (m.roomId === m.roomId && m.type === 'SYSTEM' && m.content.includes('MATCH_INIT')) {
                    try { setMatchInfo(JSON.parse(m.content)); } catch(e) {}
                }

                if (!isOutgoing) {
                    if (typingTimeoutsRef.current[m.roomId]) {
                        clearTimeout(typingTimeoutsRef.current[m.roomId]);
                    }
                    setTypingByRoom(prev => ({ ...prev, [m.roomId]: false }));
                }

                return { ...prev, [m.roomId]: [...arr, newMsg] };
            });

            // Sync with activeConvIdRef to avoid stale closure issues if needed,
            // but activeConvId is in scope if we define it differently.
            // However, we can just use setConversations with the latest activeConvId logic.
            setConversations(prev => prev.map(c => {
                if (c.id === m.roomId) {
                    const isIncoming = m.senderId !== myIdRef.current;
                    // If we are currently in this room, don't increment unread
                    const shouldIncrement = isIncoming && c.id !== activeConvIdRef.current;
                    return {
                        ...c,
                        lastMsg: formatLastMsg(m.content, m.type),
                        time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        unread: shouldIncrement ? (c.unread || 0) + 1 : 0
                    };
                }
                return c;
            }));
        }

        return () => {
            socket.off('user_typing');
            socket.disconnect();
        };
    }, []); // Only on mount

    const handleTyping = useCallback(() => {
        if (!socketRef.current || !activeConvId || activeConvId === CHATBOT_ID || !myIdRef.current) return;

        const now = Date.now();
        if (now - lastTypingEmitRef.current < 900) return;

        lastTypingEmitRef.current = now;
        socketRef.current.emit('typing', {
            roomId: activeConvId,
            userId: myIdRef.current,
        });
    }, [activeConvId]);

    // Handle Join/Leave Room for Real-time
    useEffect(() => {
        if (!socketRef.current || !activeConvId) return;

        const socket = socketRef.current;
        socket.emit('join_room', activeConvId);

        return () => {
            socket.emit('leave_room', activeConvId);
        };
    }, [activeConvId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeConvId]);

    // Load real rooms on mount
    useEffect(() => {
        import('@/lib/api').then(async ({ authAPI, chatAPI }) => {
            try {
                const meRes = await authAPI.getMe();
                const myId = meRes.data.data.user.id;
                myIdRef.current = myId;

                const roomsRes = await chatAPI.getRooms();
                const rooms = roomsRes.data.data.rooms;

                const formattedConvs = rooms.map(r => {
                    const partnerMember = r.members.find(m => m.user.id !== myId) || r.members[0];
                    const partner = partnerMember.user;
                    const isVenue = partner.role === 'OWNER';
                    return {
                        id: r.id,
                        type: isVenue ? 'venue' : 'user',
                        roomType: r.type, // Store original room type (DIRECT or MATCH_GROUP)
                        name: partner.fullName,
                        avatar: partner.avatarUrl,
                        initials: partner.fullName.charAt(0).toUpperCase(),
                        lastMsg: r.lastMessage ? formatLastMsg(r.lastMessage.content, r.lastMessage.type) : 'Bắt đầu cuộc trò chuyện...',
                        time: r.lastMessage ? new Date(r.lastMessage.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '',
                        unread: r.unreadCount || 0,
                        online: false,
                        avatarGradient: isVenue ? 'linear-gradient(135deg, #0066FF, #5E5CE6)' : 'linear-gradient(135deg, #FF6E40, #D81B60)',
                        targetUserId: partner.id,
                        isReal: true
                    };
                });

                const botConv = {
                    id: CHATBOT_ID,
                    type: 'bot',
                    name: 'SportApp AI assistant',
                    avatar: null, initials: 'BOT',
                    lastMsg: 'Tôi có thể giúp bạn tìm sân, đặt lịch hoặc xem báo cáo.',
                    time: 'Hệ thống', unread: 0, online: true,
                    avatarGradient: 'linear-gradient(135deg, #FF6E40, #D81B60)',
                    isReal: true
                };

                setConversations([botConv, ...formattedConvs]);
            } catch (err) {
                console.error("Failed to load real chat rooms", err);
            }
        });
    }, []);

    // Load messages and Check Match Info
    useEffect(() => {
        if (!activeConvId || activeConvId === CHATBOT_ID) return;
        const conv = conversations.find(c => c.id === activeConvId);
        
        // Reset match info
        setMatchInfo(null);

        if (conv?.isReal) {
            import('@/lib/api').then(({ chatAPI }) => {
                chatAPI.getMessages(activeConvId).then(res => {
                    const msgsList = res.data?.data?.messages || [];
                    const formattedMsgs = msgsList.map(m => ({
                        id: m.id,
                        type: m.type === 'SYSTEM' ? 'system' : (m.senderId === user?.id ? 'outgoing' : 'incoming'),
                        isOutgoing: m.senderId === user?.id, 
                        originalType: m.type,
                        text: m.content,
                        data: m.type === 'SYSTEM' ? (() => { try { return JSON.parse(m.content); } catch(e) { return null; } })() : null,
                        time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        read: m.isRead
                    }));
                    setMessages(prev => ({ ...prev, [activeConvId]: formattedMsgs }));
                    setConversations(prev => prev.map(c => {
                        if (c.id === activeConvId) return { ...c, unread: 0 };
                        return c;
                    }));

                    // Try to find MATCH_INIT message to populate banner
                    const initMsg = msgsList.find(m => m.type === 'SYSTEM' && m.content.includes('MATCH_INIT'));
                    if (initMsg) {
                        try {
                            const data = JSON.parse(initMsg.content);
                            setMatchInfo(data);
                        } catch(e) {}
                    } else if (conv.roomType === 'MATCH_GROUP') {
                        // Fallback: Fetch info from API if not in the first message batch
                        chatAPI.getRoomMatchInfo(activeConvId).then(infoRes => {
                            setMatchInfo(infoRes.data.data);
                        }).catch(err => {
                            console.log("Could not find match info for this room:", err);
                        });
                    }
                }).catch(e => console.error("Failed to fetch messages for room", e));
            });
        }
    }, [activeConvId, user?.id]);

    const handleAction = (action, data) => {
        if (action === 'accept_venue') {
            import('@/lib/api').then(({ chatAPI }) => {
                chatAPI.acceptVenueSuggestion(data).then(() => {
                    // Success, handled by socket event
                }).catch(e => alert("Không thể đồng ý gợi ý này."));
            });
            return;
        }

        if (action === 'SYSTEM_CARD_ACTION' && data) {
            const { action: cardAction, payload, messageId } = data;

            if (cardAction === 'ACCEPT_VENUE_SUGGESTION') {
                import('@/lib/api').then(({ chatAPI }) => {
                    chatAPI.acceptVenueSuggestion(messageId)
                        .catch(() => alert('Không thể đồng ý gợi ý này.'));
                });
                return;
            }

            if (typeof cardAction === 'string' && cardAction.startsWith('BOOK_VENUE:')) {
                const venueId = cardAction.split(':')[1]?.trim();
                if (venueId) window.location.href = `/venues/${venueId}`;
                return;
            }

            if (cardAction === 'VIEW_MATCH_DETAILS') {
                if (payload) window.location.href = `/matchmaking?post=${payload}`;
                return;
            }

            if (cardAction === 'JOIN_MATCH') {
                import('@/lib/api').then(({ matchmakingAPI }) => {
                    matchmakingAPI.sendRequest(payload)
                        .then(() => alert('Đã gửi yêu cầu tham gia thành công!'))
                        .catch(e => alert(e.response?.data?.message || 'Không thể tham gia.'));
                });
            }
        }
    };

    const handleSuggestVenue = () => {
        if (!matchInfo) {
            alert("Đang tải thông tin trận đấu, vui lòng đợi trong giây lát...");
            return;
        }
        
        setIsLoadingVenues(true);
        import('@/lib/api').then(({ matchmakingAPI }) => {
            matchmakingAPI.getSuggestedVenues(matchInfo.postId)
                .then(res => {
                    setSuggestedVenues(res.data.data.venues || []);
                    setIsSuggestModalOpen(true);
                })
                .catch(err => {
                    console.error("Gợi ý sân lỗi:", err);
                    alert("Không thể tải danh sách sân gợi ý. Vui lòng thử lại sau.");
                })
                .finally(() => {
                    setIsLoadingVenues(false);
                });
        }).catch(err => {
            setIsLoadingVenues(false);
            console.error("API import error:", err);
        });
    };

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

    useEffect(() => {
        if (activeConvId !== CHATBOT_ID) return;

        let cancelled = false;
        let intervalId = null;

        const fetchPinnedWeather = async () => {
            try {
                const location = await getBrowserLocation();
                const command = buildWeatherCommand(location);
                const { chatbotAPI } = await import('@/lib/api');
                const res = await chatbotAPI.sendMessage(command, [], location || undefined);
                const weatherTool = (res.data?.data?.toolResults || []).find(t => t.type === 'weather');
                if (!cancelled && weatherTool?.data) {
                    setPinnedWeatherData(weatherTool.data);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn('Failed to refresh pinned weather:', error?.message || error);
                }
            }
        };

        fetchPinnedWeather();
        intervalId = setInterval(fetchPinnedWeather, 15 * 60 * 1000);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeConvId, getBrowserLocation]);

    const onSelectVenue = (venue) => {
        import('@/lib/api').then(({ chatAPI }) => {
            chatAPI.suggestVenue(activeConvId, {
                venueId: venue.id,
                price: venue.minPrice || 0
            }).then(() => {
                setIsSuggestModalOpen(false);
            });
        });
    };

    const handleNewAiChat = useCallback(() => {
        const greeting = [{
            id: `ai-greeting-${Date.now()}`,
            role: 'assistant',
            content: AI_GREETING,
            createdAt: new Date().toISOString(),
        }];
        const historyKey = serializeAiHistory(greeting);
        setBotHistory(greeting);
        setMessages(prev => ({ ...prev, [CHATBOT_ID]: toChatbotUiMessages(greeting) }));
        aiHistorySyncKeyRef.current = historyKey;
        setBookingDate('');
        setSelectedFieldId(null);
        setSelectedSlots([]);
        setAvailableSlots([]);
        try {
            sessionStorage.setItem(getAiHistoryKey(user?.id), JSON.stringify({ messages: greeting }));
            window.dispatchEvent(new CustomEvent('ai-history-updated', { detail: { messages: greeting, historyKey } }));
        } catch (error) {
            console.warn('Failed to reset AI chat:', error);
        }
    }, [user?.id]);

    const handleSend = async (messageText) => {
        const msgText = typeof messageText === 'string' ? messageText : message.trim();
        if (!msgText || !activeConvId || !activeConv) return;
        setMessage('');

        if (activeConvId === CHATBOT_ID) {
            const nowIso = new Date().toISOString();
            const location = await getBrowserLocation();
            const outboundText = isWeatherQuery(msgText) ? buildWeatherCommand(location) : msgText;
            const userMsg = {
                id: Date.now(),
                type: 'outgoing',
                isOutgoing: true,
                text: msgText,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                createdAt: nowIso,
            };
            setMessages(prev => ({ 
                ...prev, 
                [CHATBOT_ID]: [...(prev[CHATBOT_ID] || []), userMsg] 
            }));
            
            setIsBotLoading(true);
            try {
                // Get conversation history for bot context
                const history = botHistory.slice(-4);
                console.log("[Chat Debug] Sending message:", msgText);
                console.log("[Chat Debug] History context:", history);
                
                const res = await chatbotAPI.sendMessage(outboundText, history, location || undefined);
                const data = res.data.data;
                
                console.log("[Chat Debug] Bot response received:", data);

                const botMsg = {
                    id: Date.now() + 1,
                    type: 'incoming',
                    isOutgoing: false,
                    text: data.message,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    isBot: true,
                    data: data, // Store full response for complex rendering
                    createdAt: new Date().toISOString(),
                };

                setMessages(prev => ({ 
                    ...prev, 
                    [CHATBOT_ID]: [...(prev[CHATBOT_ID] || []), botMsg] 
                }));
                // Update history with raw strings for the API - keep all messages for sync with widget
                setBotHistory(prev => [
                    ...prev,
                    { role: 'user', content: msgText, createdAt: nowIso },
                    { role: 'assistant', content: data.message, toolResults: data.toolResults || [], createdAt: new Date().toISOString() }
                ]);
            } catch (err) {
                console.error("Bot error:", err);
            } finally {
                setIsBotLoading(false);
            }
            return;
        }

        if (activeConv.isReal) {
            import('@/lib/api').then(({ chatAPI }) => {
                chatAPI.sendMessage(activeConvId, { content: msgText })
                    .catch(e => console.error("Send message error", e));
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleUploadImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeConv || !activeConvId) return;

        try {
            const { uploadAPI, chatAPI } = await import('@/lib/api');
            const uploadRes = await uploadAPI.single(file);
            const imageUrl = uploadRes?.data?.data?.url;
            if (!imageUrl) return;

            if (activeConvId === CHATBOT_ID) {
                const imageMsg = {
                    id: Date.now(),
                    type: 'outgoing',
                    isOutgoing: true,
                    originalType: 'IMAGE',
                    text: imageUrl,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => ({
                    ...prev,
                    [CHATBOT_ID]: [...(prev[CHATBOT_ID] || []), imageMsg],
                }));
                return;
            }

            await chatAPI.sendMessage(activeConvId, { content: imageUrl, type: 'IMAGE' });
        } catch (error) {
            console.error('Send image error:', error);
        } finally {
            e.target.value = '';
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.chatLayout}>
                {/* ─── SIDEBAR ─── */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h1 className={styles.sidebarTitle}>Tin nhắn</h1>
                        <div className={styles.searchWrapper}>
                            <span className={styles.searchIcon}><SearchIcon /></span>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Tìm kiếm cuộc trò chuyện..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.sidebarTabs}>
                        {[
                            { key: 'all', label: 'Tất cả' },
                            { key: 'users', label: 'Bạn bè' },
                            { key: 'venues', label: 'Sân thể thao' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={`${styles.sidebarTab} ${activeTab === tab.key ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.conversationList}>
                        {activeTab !== 'venues' && botConvs.length > 0 && (
                            <>
                                <div className={styles.sectionLabel}>TRỢ LÝ AI</div>
                                {botConvs.map(conv => (
                                    <ConvItem
                                        key={conv.id}
                                        conv={conv}
                                        active={activeConvId === conv.id}
                                        onClick={() => setActiveConvId(conv.id)}
                                    />
                                ))}
                            </>
                        )}
                        {activeTab !== 'venues' && userConvs.length > 0 && (
                            <>
                                <div className={styles.sectionLabel}>Bạn bè & Đồng đội</div>
                                {userConvs.map(conv => (
                                    <ConvItem
                                        key={conv.id}
                                        conv={conv}
                                        active={activeConvId === conv.id}
                                        onClick={() => setActiveConvId(conv.id)}
                                    />
                                ))}
                            </>
                        )}
                        {activeTab !== 'users' && venueConvs.length > 0 && (
                            <>
                                <div className={styles.sectionLabel}>Sân thể thao</div>
                                {venueConvs.map(conv => (
                                    <ConvItem
                                        key={conv.id}
                                        conv={conv}
                                        active={activeConvId === conv.id}
                                        onClick={() => setActiveConvId(conv.id)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </aside>

                {/* ─── CHAT WINDOW ─── */}
                <div className={styles.chatWindow}>
                    {!activeConv ? (
                        <EmptyChatState />
                    ) : (
                        <>
                            {/* Header */}
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderLeft}>
                                    <div className={styles.chatHeaderAvatar}>
                                        <Avatar conv={activeConv} size={40} />
                                        {activeConv.online && <span className={styles.onlineDot} />}
                                    </div>
                                    <div>
                                        <div className={styles.chatHeaderName}>{activeConv.name}</div>
                                        <div className={`${styles.chatHeaderStatus} ${!activeConv.online ? styles.chatHeaderStatusOffline : ''}`}>
                                            {activeConv.online
                                                ? (isTyping ? 'Đang nhập...' : 'Đang hoạt động')
                                                : 'Ngoại tuyến'}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.chatHeaderActions}>
                                    {activeConvId === CHATBOT_ID && (
                                        <button className={styles.newChatBtn} onClick={handleNewAiChat}>
                                            Tạo chat mới
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Match Banner if available */}
                            <MatchBanner 
                                info={matchInfo} 
                                roomType={activeConv.roomType} 
                                onSuggest={handleSuggestVenue} 
                            />

                            {activeConvId === CHATBOT_ID && pinnedWeatherData && (
                                <div className={styles.pinnedWeatherWrap}>
                                    <ChatCardRenderer
                                        type="weather"
                                        data={pinnedWeatherData}
                                        onAction={handleSend}
                                        isLoading={false}
                                    />
                                </div>
                            )}

                            {/* Messages */}
                            <div className={styles.messagesArea}>
                                <div className={styles.dateDivider}>
                                    <div className={styles.dateDividerLine} />
                                    <span className={styles.dateDividerText}>Hôm nay</span>
                                    <div className={styles.dateDividerLine} />
                                </div>

                                {currentMsgs.length === 0 && activeConvId === CHATBOT_ID && (
                                    <div className={styles.welcomeMsg}>
                                        <div className={styles.welcomeIcon}>
                                            <BotIcon size={32} />
                                        </div>
                                        <h4>Chào mừng bạn đến với SportApp AI!</h4>
                                        <p>Tôi là trợ lý ảo sẵn sàng hỗ trợ bạn tìm sân, đặt chỗ hoặc giải đáp các thắc mắc về thể thao.</p>
                                        <div className={styles.quickActions}>
                                            {[
                                                'Tìm sân bóng đá gần đây',
                                                'Sân nào đang có khuyến mãi?',
                                                'Xem lịch đặt sân của tôi',
                                                'Dự báo thời tiết thể thao'
                                            ].map((action, i) => (
                                                <button 
                                                    key={i} 
                                                    className={styles.quickAction}
                                                    onClick={() => handleSend(action)}
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    const bookingStates = {
                                        bookingDate, setBookingDate,
                                        paymentType, setPaymentType,
                                        availableSlots, selectedSlots,
                                        isLoadingSlots,
                                        selectedFieldId, setSelectedFieldId,
                                    };
                                    const bookingHandlers = {
                                        handleSlotClick,
                                        handleBookingSubmit
                                    };

                                    return currentMsgs.map(msg => (
                                        <MessageBubble 
                                            key={msg.id} 
                                            msg={msg} 
                                            conv={activeConv} 
                                            onAction={handleAction} 
                                            onSend={handleSend}
                                            isBotLoading={isBotLoading}
                                            bookingStates={bookingStates}
                                            bookingHandlers={bookingHandlers}
                                        />
                                    ));
                                })()}

                                {isBotLoading && <BotTypingIndicator />}

                                {isTyping && (
                                    <div className={styles.typingIndicator}>
                                        <Avatar conv={activeConv} size={28} />
                                        <div className={styles.typingBubble}>
                                            <span className={styles.typingDot} />
                                            <span className={styles.typingDot} />
                                            <span className={styles.typingDot} />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Compose */}
                            <ChatComposer
                                activeConv={activeConv}
                                activeConvId={activeConvId}
                                chatbotId={CHATBOT_ID}
                                message={message}
                                setMessage={setMessage}
                                showEmoji={showEmoji}
                                setShowEmoji={setShowEmoji}
                                emojis={EMOJIS}
                                composeRef={composeRef}
                                fileInputRef={fileInputRef}
                                onSend={handleSend}
                                onKeyDown={handleKeyDown}
                                onUploadImage={handleUploadImage}
                                onTyping={handleTyping}
                            />
                        </>
                    )}
                </div>
            </div>

            <VenueSelectionModal 
                isOpen={isSuggestModalOpen}
                onClose={() => setIsSuggestModalOpen(false)}
                venues={suggestedVenues}
                onSelect={onSelectVenue}
            />
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div style={{display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center'}}><div className="spinner-lg" /></div>}>
            <ChatApp />
        </Suspense>
    );
}
