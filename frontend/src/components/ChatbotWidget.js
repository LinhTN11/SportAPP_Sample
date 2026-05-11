/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Send, X, Maximize2, Minimize2, XCircle, Building2, Hand } from 'lucide-react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatbotAPI, bookingsAPI } from '@/lib/api';
import {
    sanitizeRawToolCallText,
    parseRawToolCall,
    buildBypassCommand,
} from '@/lib/chatbotToolFallback';
import VenueChatCard from './VenueChatCard';
import ChatCardRenderer from './chat/ChatCardRenderer';
import DatePicker from '@/components/ui/DatePicker';
import styles from './ChatbotWidget.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const BotIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
);

const parseSystemActionPayload = (content) => {
    if (typeof content !== 'string') return null;

    const trimmed = content.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

    try {
        const parsed = JSON.parse(trimmed);
        return parsed?.action ? parsed : null;
    } catch (_) {
        return null;
    }
};

export default function ChatbotWidget() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [weather, setWeather] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [paymentType, setPaymentType] = useState('DEPOSIT');
    const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
    const paymentDropdownRef = useRef(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
    const fieldDropdownRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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

    // Fetch available slots when date or field changes in the form
    useEffect(() => {
        const fetchSlots = async () => {
            const lastMsg = messages[messages.length - 1];
            const currentForm = lastMsg?.toolResults?.find(r => r.type === 'booking_form');
            if (currentForm && bookingDate) {
                // If we have selectedFieldId, use it; otherwise use the initial from tool result
                const targetFieldId = selectedFieldId || currentForm.data.fieldId;
                const { openTime, closeTime, availableFields } = currentForm.data;
                
                // If there were multiple fields, find the pricing rules for the selected one
                let pricingRules = currentForm.data.pricingRules;
                if (availableFields && selectedFieldId) {
                    const matchedField = availableFields.find(f => f.id === selectedFieldId);
                    if (matchedField) pricingRules = matchedField.pricingRules;
                }

                setIsLoadingSlots(true);
                try {
                    // 1. Fetch booked slots directly from DB (Bypass AI)
                    const res = await bookingsAPI.getFieldSlots(targetFieldId, bookingDate);
                    const bookedSlots = res.data.data.bookedSlots || [];

                    // 2. Local Slot Generation (Same as VenueDetail)
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

                        // Check Booking Overlap
                        const isBooked = bookedSlots.some(s => {
                            const sStart = timeToMinutes(s.startTime);
                            const sEnd = timeToMinutes(s.endTime);
                            return Math.max(current, sStart) < Math.min(currentEnd, sEnd);
                        });

                        // Check Past Time
                        const today = new Date();
                        const todayStr = today.toISOString().split('T')[0];
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
            setSelectedSlots([]); // Clear when date changes
        }
    }, [bookingDate, messages, selectedFieldId]);

    // Handle Auto-fill from Tool Results
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg.toolResults) {
            const formResult = lastMsg.toolResults.find(r => r.type === 'booking_form');
            if (formResult?.data?.currentArgs) {
                const args = formResult.data.currentArgs;
                if (args.bookingDate) setBookingDate(args.bookingDate);
                if (args.paymentType) setPaymentType(args.paymentType);
                if (args.fieldId) setSelectedFieldId(args.fieldId);
            }
        }
    }, [messages]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(e.target)) {
                setPaymentDropdownOpen(false);
            }
            if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target)) {
                setFieldDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSlotClick = (slot) => {
        if (slot.booked) return;

        // 1. If nothing selected or re-starting, just select this one
        if (selectedSlots.length === 0 || selectedSlots.length > 1) {
            setSelectedSlots([slot]);
            return;
        }

        // 2. Already exactly 1 slot selected, this second click defines a RANGE
        const firstSlot = selectedSlots[0];

        // 3. Toggle off if same slot
        if (firstSlot.time === slot.time) {
            setSelectedSlots([]);
            return;
        }

        // 4. Find all slots in between
        const start = Math.min(firstSlot.minutes, slot.minutes);
        const end = Math.max(firstSlot.minutes, slot.minutes);

        const range = availableSlots.filter(s => s.minutes >= start && s.minutes <= end);

        // 5. BLOCK range if any slot inside is already booked
        if (range.some(s => s.booked)) {
            // Just select the new one instead
            setSelectedSlots([slot]);
            return;
        }

        setSelectedSlots(range.sort((a, b) => a.minutes - b.minutes));
    };

    const handleBookingSubmit = async (fieldId) => {
        if (selectedSlots.length === 0) return;

        // The startTime is the start of the first slot
        const startTime = selectedSlots[0].time;

        // The endTime is the end of the last slot (extracted from displayLabel)
        const lastSlot = selectedSlots[selectedSlots.length - 1];
        const endTime = lastSlot.displayLabel.split(' - ')[1];

        const command = `create_booking fieldId=${fieldId} bookingDate=${bookingDate} startTime=${startTime} endTime=${endTime} paymentType=${paymentType}`;
        setBookingDate('');
        setSelectedFieldId(null); // Reset after booking
        setSelectedSlots([]);
        setAvailableSlots([]);
        await handleSend(command);
    };

    // Fetch weather and geolocation on open
    useEffect(() => {
        if (isOpen && !weather) {
            chatbotAPI.getWeather().then(res => {
                setWeather(res.data.data);
            }).catch(() => { });
        }
        // Request geolocation
        if (isOpen && !userLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.log('[Chatbot] Geolocation denied:', err.message),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, [isOpen, weather, userLocation]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleOpen = () => {
        setIsOpen(true);
        setIsClosing(false);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 250);
    };

    const handleSend = useCallback(async (messageText) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        setInput('');
        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);

        const trimmedHistory = messages.slice(-10); // Synchronized with main chat (10 messages)
        setIsLoading(true);

        try {
            const venueMatch = pathname?.match(/\/venues\/([a-f\d-]+)/i);
            const currentVenueId = venueMatch ? venueMatch[1] : null;

            const res = await chatbotAPI.sendMessage(text, trimmedHistory, userLocation, currentVenueId);
            let data = res.data.data;

            if ((!data.toolResults || data.toolResults.length === 0) && /<tool_call\b/i.test(data.message || '')) {
                const parsedTool = parseRawToolCall(data.message);
                const bypassCommand = buildBypassCommand(parsedTool);

                if (bypassCommand) {
                    try {
                        const recovered = await chatbotAPI.sendMessage(bypassCommand, trimmedHistory, userLocation, currentVenueId);
                        data = recovered.data.data;
                    } catch (_) {
                        data = {
                            ...data,
                            message: sanitizeRawToolCallText(data.message) || 'Mình đã hiểu yêu cầu, bạn thử lại giúp mình một lần nữa nhé.',
                        };
                    }
                } else {
                    data = {
                        ...data,
                        message: sanitizeRawToolCallText(data.message),
                    };
                }
            } else {
                data = {
                    ...data,
                    message: sanitizeRawToolCallText(data.message),
                };
            }

            const botMsg = {
                role: 'assistant',
                content: data.message,
                toolResults: data.toolResults || [],
                error: data.error || false,
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
                error: true,
                toolResults: [],
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, userLocation, pathname]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleBookVenue = (venue) => {
        handleSend(`BOOK_VENUE: ${venue.id}`);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
    });

    if (!isAuthenticated || pathname === '/chat') return null;

    const roleLabel = {
        CUSTOMER: 'Khách hàng',
        OWNER: 'Chủ sân',
        ADMIN: 'Quản trị viên',
    };

    const quickActions = {
        CUSTOMER: [
            'Tìm sân bóng đá',
            'Xem booking của tôi',
            'Hôm nay có sân nào trống không?',
            'Sân nào gần đây đang giảm giá?',
            'Chính sách hủy sân?'
        ],
        OWNER: [
            'Xuất báo cáo doanh thu tháng này',
            'Xem danh sách sân của tôi',
            'Xem booking tuần này',
            'Tìm sân bóng đá',
        ],
        ADMIN: [
            'Thống kê toàn hệ thống',
            'Xuất báo cáo nền tảng',
            'Xem các chủ sân hàng đầu',
            'Tìm sân bóng đá',
        ],
    };

    const renderToolResults = (toolResults, idx) => {
        if (!toolResults || toolResults.length === 0) return null;

        return (
            <div className={styles.toolResults}>
                {toolResults.map((result, i) => {
                    if (!result.data) return null;

                    if ((result.type === 'options' || result.type === 'clarification') && (result.data.options || result.data.fields)) {
                        const options = result.data.fields || result.data.options;
                        const isFields = !!result.data.fields;

                        return (
                            <div key={`clarification-${i}`} className={isFields ? styles.fieldCardGrid : styles.optionsContainer}>
                                {options.map((opt, j) => {
                                    const label = typeof opt === 'object' ? opt.name : opt;
                                    const value = typeof opt === 'object' ? opt.id : opt;
                                    const pricing = typeof opt === 'object' ? opt.pricingRules : null;

                                    if (isFields) {
                                        return (
                                            <div key={j} className={styles.fieldSelectionCard}>
                                                <div className={styles.fieldCardIcon}><Building2 size={24} /></div>
                                                <div className={styles.fieldCardInfo}>
                                                    <div className={styles.fieldCardName}>{label}</div>
                                                    <div className={styles.fieldCardPrice}>
                                                        {pricing && pricing.length > 0 ? `Từ ${formatPrice(pricing[0].price)}/h` : 'Giá linh hoạt'}
                                                    </div>
                                                </div>
                                                <button
                                                    className={styles.fieldSelectBtn}
                                                    onClick={() => handleSend(value)}
                                                    disabled={isLoading}
                                                >
                                                    Chọn
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={j}
                                            className={styles.optionChip}
                                            onClick={() => handleSend(value)}
                                            disabled={isLoading}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (result.type === 'available_slots' && result.data.slots) {
                        return (
                            <div key={`slots-${i}`} className={styles.slotDiscoveryContainer}>
                                <div className={styles.slotDiscoveryHeader}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    Giờ trống ngày {result.data.date}
                                </div>
                                <div className={styles.slotChipGrid}>
                                    {result.data.slots.map((slot, j) => (
                                        <button
                                            key={j}
                                            className={styles.slotDiscoveryChip}
                                            onClick={() => handleSend(`Đặt sân vào lúc ${slot.time}`)}
                                            disabled={isLoading}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    if (result.type === 'venues' && Array.isArray(result.data)) {
                        return result.data.map((venue, j) => (
                            <VenueChatCard
                                key={`venue-${i}-${j}`}
                                venue={venue}
                                onBookClick={handleBookVenue}
                            />
                        ));
                    }

                    if (result.type === 'file_download') {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('sportapp_token') : '';
                        return (
                            <a
                                key={`dl-${i}`}
                                className={styles.downloadBtn}
                                href={`${API_BASE}/chatbot/export/${result.data.filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    fetch(`${API_BASE}/chatbot/export/${result.data.filename}`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                    })
                                        .then(res => res.blob())
                                        .then(blob => {
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = result.data.filename;
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                        });
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: 4 }}>
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                </svg>
                                {result.data.filename}
                            </a>
                        );
                    }

                    if (result.type === 'stats') {
                        return (
                            <div key={`stats-${i}`} className={styles.statsCard}>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{result.data.totalUsers}</div>
                                    <div className={styles.statLabel}>Người dùng</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{result.data.totalVenues}</div>
                                    <div className={styles.statLabel}>Sân hoạt động</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{result.data.totalBookings}</div>
                                    <div className={styles.statLabel}>Bookings</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{formatPrice(result.data.totalRevenue)}</div>
                                    <div className={styles.statLabel}>Doanh thu</div>
                                </div>
                            </div>
                        );
                    }

                    if (result.type === 'booking_created') {
                        return (
                            <div key={`booking-${i}`} className={styles.bookingCard}>
                                <div className={styles.bookingHeader}>
                                    <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    <span>ĐẶT SÂN THÀNH CÔNG!</span>
                                </div>

                                <div className={styles.bookingGrid}>
                                    <div className={styles.bookingItem}>
                                        <div className={styles.bookingIconWrapper}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                        </div>
                                        <div className={styles.bookingText}>
                                            <div className={styles.bookingLabel}>ĐỊA ĐIỂM</div>
                                            <div className={styles.bookingValue}>{result.data.venueName} - {result.data.fieldName}</div>
                                        </div>
                                    </div>

                                    <div className={styles.bookingItem}>
                                        <div className={styles.bookingIconWrapper}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                        </div>
                                        <div className={styles.bookingText}>
                                            <div className={styles.bookingLabel}>THỜI GIAN</div>
                                            <div className={styles.bookingValue}>{result.data.date} | {result.data.time}</div>
                                        </div>
                                    </div>

                                    <div className={styles.bookingItem}>
                                        <div className={styles.bookingIconWrapper}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                                <line x1="2" y1="10" x2="22" y2="10" />
                                            </svg>
                                        </div>
                                        <div className={styles.bookingText}>
                                            <div className={styles.bookingLabel}>CHI PHÍ</div>
                                            <div className={styles.bookingValue}>
                                                Tổng: {formatPrice(result.data.totalPrice)}<br />
                                                Cọc: {formatPrice(result.data.depositAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.bookingFooter}>
                                    <button
                                        onClick={() => {
                                            router.push('/bookings');
                                            handleClose();
                                        }}
                                        className={styles.viewBookingsBtn}
                                    >
                                        Xem Đơn Của Tôi
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    if (result.type === 'bookings' && Array.isArray(result.data)) {
                        const statusColors = {
                            PENDING_DEPOSIT: '#ed8936', CONFIRMED: '#38a169',
                            COMPLETED: '#3182ce', CANCELLED: '#e53e3e', EXPIRED: '#718096',
                        };
                        const statusLabels = {
                            PENDING_DEPOSIT: 'Chờ cọc', CONFIRMED: 'Đã xác nhận',
                            COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn',
                        };
                        return (
                            <div key={`bookings-${i}`} className={styles.bookingsList}>
                                {result.data.map((b, j) => (
                                    <div key={j} className={styles.miniBookingCard}>
                                        <div className={styles.miniBookingHeader}>
                                            <div className={styles.miniBookingVenue}>{b.venueName}</div>
                                            <span className={styles.statusBadge} style={{
                                                color: statusColors[b.status] || '#718096',
                                                background: (statusColors[b.status] || '#718096') + '15',
                                            }}>
                                                {statusLabels[b.status] || b.status}
                                            </span>
                                        </div>

                                        <div className={styles.miniBookingInfo}>
                                            <div className={styles.miniBookingDetail}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M12 6v6l4 2" />
                                                </svg>
                                                {b.fieldName} · {b.time}
                                            </div>
                                            <div className={styles.miniBookingDetail}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                </svg>
                                                {b.date} · {formatPrice(b.totalPrice)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }

                    if (result.type === 'booking_form') {
                        const { fieldId, fieldName, venueName, availableFields } = result.data;
                        const activeFieldId = selectedFieldId || fieldId;
                        const activeFieldName = availableFields?.find(f => f.id === activeFieldId)?.name || fieldName;

                        return (
                            <div className={styles.bookingFormContainer} key={idx}>
                                <div className={styles.formHeader}>
                                    <div className={styles.formVenueInfo}>
                                        <h4>{venueName}</h4>
                                        {!availableFields && <div className={styles.formFieldBadge}>{fieldName}</div>}
                                    </div>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); handleBookingSubmit(activeFieldId); }}>
                                    {availableFields && availableFields.length > 0 && (
                                        <div className={styles.formFullRow} style={{ marginBottom: '15px' }}>
                                            <div className={styles.formItem} ref={fieldDropdownRef}>
                                                <label className={styles.premiumLabel}>CHỌN SÂN</label>
                                                <div className={styles.customDropdown}>
                                                    <div
                                                        className={`${styles.dropdownTrigger} ${fieldDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                                        onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
                                                    >
                                                        <span>{activeFieldName}</span>
                                                        <ChevronDown size={16} className={`${styles.dropdownChevron} ${fieldDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                                                    </div>

                                                    {fieldDropdownOpen && (
                                                        <div className={styles.dropdownMenu}>
                                                            {availableFields.map((f, fi) => (
                                                                <div
                                                                    key={fi}
                                                                    className={`${styles.dropdownOption} ${activeFieldId === f.id ? styles.dropdownOptionActive : ''}`}
                                                                    onClick={() => {
                                                                        setSelectedFieldId(f.id);
                                                                        setFieldDropdownOpen(false);
                                                                        setSelectedSlots([]);
                                                                    }}
                                                                >
                                                                    {f.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.formTwoColRow}>
                                        <div className={styles.formItem}>
                                            <label className={styles.premiumLabel}>NGÀY ĐẶT SÂN</label>
                                            <div className={styles.datePickerWrapper}>
                                                <DatePicker
                                                    value={bookingDate}
                                                    onChange={(val) => setBookingDate(val)}
                                                    minDate={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.formItem} ref={paymentDropdownRef}>
                                            <label className={styles.premiumLabel}>THANH TOÁN</label>
                                            <div className={styles.customDropdown}>
                                                <div
                                                    className={`${styles.dropdownTrigger} ${paymentDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                                    onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}
                                                >
                                                    <span>{paymentType === 'DEPOSIT' ? 'Đặt cọc (10%)' : 'Thanh toán đủ (100%)'}</span>
                                                    <ChevronDown size={16} className={`${styles.dropdownChevron} ${paymentDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                                                </div>

                                                {paymentDropdownOpen && (
                                                    <div className={styles.dropdownMenu}>
                                                        <div
                                                            className={`${styles.dropdownOption} ${paymentType === 'DEPOSIT' ? styles.dropdownOptionActive : ''}`}
                                                            onClick={() => {
                                                                setPaymentType('DEPOSIT');
                                                                setPaymentDropdownOpen(false);
                                                            }}
                                                        >
                                                            Đặt cọc (10%)
                                                        </div>
                                                        <div
                                                            className={`${styles.dropdownOption} ${paymentType === 'FULL' ? styles.dropdownOptionActive : ''}`}
                                                            onClick={() => {
                                                                setPaymentType('FULL');
                                                                setPaymentDropdownOpen(false);
                                                            }}
                                                        >
                                                            Thanh toán đủ (100%)
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {bookingDate && (
                                        <div className={styles.timeSlotBlock}>
                                            <label className={styles.blockLabel}>Chọn khung giờ</label>
                                            {isLoadingSlots ? (
                                                <div className={styles.slotLoader}>Đang tìm khung giờ trống...</div>
                                            ) : (
                                                <div className={styles.timeGrid}>
                                                    {availableSlots.length > 0 ? (
                                                        availableSlots.map((slot, i) => {
                                                            const isSelected = selectedSlots.find(s => s.time === slot.time);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`${styles.timeBlock} ${slot.booked ? styles.timeBooked : ''} ${isSelected ? styles.timeSelected : ''}`}
                                                                    onClick={() => handleSlotClick(slot)}
                                                                >
                                                                    <span className={styles.timeLabel}>{slot.displayLabel}</span>
                                                                    {slot.price > 0 && <span className={styles.timePrice}>{formatPrice(slot.price)}</span>}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className={styles.slotPlaceholder}>Không có khung giờ nào khả dụng</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className={styles.premiumSubmitBtn}
                                        disabled={isLoading || selectedSlots.length === 0}
                                        style={{ marginTop: '20px' }}
                                    >
                                        {isLoading ? 'Đang xử lý...' : 'Xác nhận đặt sân ngay'}
                                    </button>
                                </form>
                            </div>
                        );
                    }

                    return null;
                })}
            </div >
        );
    };

    return (
        <>
            {/* Floating Bubble */}
            <button
                id="chatbot-bubble"
                className={`${styles.chatBubble} ${isOpen ? styles.chatBubbleHidden : ''}`}
                onClick={handleOpen}
                aria-label="Mở trợ lý AI"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    id="chatbot-window"
                    className={`${styles.chatWindow} ${isExpanded ? styles.chatWindowExpanded : ''} ${isClosing ? styles.chatWindowClosing : ''}`}
                >
                    {/* Header */}
                    <div className={styles.chatHeader}>
                        <div className={styles.headerLeft}>
                            <div className={styles.botAvatar}>
                                <BotIcon size={22} />
                            </div>
                            <div className={styles.headerInfo}>
                                <h3>SportApp AI</h3>
                                <span>{roleLabel[user?.role] || 'Trợ lý'}</span>
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.headerBtn}
                                onClick={() => setIsExpanded(!isExpanded)}
                                title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
                            >
                                {isExpanded ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                    </svg>
                                )}
                            </button>
                            <button className={styles.headerBtn} onClick={handleClose} title="Đóng">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Weather Banner */}
                    {weather && (
                        <div className={styles.weatherBanner}>
                            <div className={styles.weatherContent}>
                                <span className={styles.weatherIcon}>{weather.current.icon}</span>
                                <div className={styles.weatherDetails}>
                                    <div className={styles.weatherTemp}>
                                        {weather.current.temperature}°C · {weather.current.description}
                                    </div>
                                    <div className={styles.weatherDesc} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7z"/></svg>
                                            {weather.current.humidity}%
                                        </span>
                                        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
                                            {weather.current.windSpeed} km/h
                                        </span>
                                    </div>
                                    <div className={styles.weatherDate}>{dateStr}</div>
                                </div>
                            </div>
                            {weather.warnings && weather.warnings.length > 0 && (
                                <div className={styles.weatherWarnings}>
                                    {weather.warnings.slice(0, 2).map((w, i) => (
                                        <div key={i} className={styles.weatherWarning}>{w.message}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages */}
                    <div className={styles.messagesArea}>
                        {messages.length === 0 && (
                            <div className={styles.welcomeMsg}>
                                <h4>Xin chào, {user?.fullName || 'bạn'}! <Hand size={20} style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /></h4>
                                <p>
                                    Tôi là trợ lý AI của SportApp. Tôi có thể giúp bạn tìm sân, đặt sân,
                                    {user?.role === 'OWNER' && ' xuất báo cáo tài chính,'}
                                    {user?.role === 'ADMIN' && ' thống kê hệ thống, xuất báo cáo,'}
                                    {' '}và trả lời các câu hỏi liên quan.
                                </p>
                                <div className={styles.quickActions}>
                                    {(quickActions[user?.role] || quickActions.CUSTOMER).map((q, i) => (
                                        <button
                                            key={i}
                                            className={styles.quickAction}
                                            onClick={() => handleSend(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => {
                            if (msg.role === 'user' && (msg.content.startsWith('BOOK_VENUE:') || msg.content.startsWith('create_booking'))) {
                                return null;
                            }

                            const systemPayload = msg.role === 'assistant' ? parseSystemActionPayload(msg.content) : null;
                            const hasToolCardForSystemPayload = !!(
                                systemPayload &&
                                msg.toolResults?.some((result) => result?.data?.action === systemPayload.action)
                            );
                            const shouldHideRawBubble = msg.role === 'assistant' && !!systemPayload;

                            return (
                                <div key={i}>
                                    <div className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot}`}>
                                        {msg.role === 'assistant' && (
                                            <div className={`${styles.msgAvatar} ${styles.msgAvatarBot}`}>
                                                <BotIcon size={16} />
                                            </div>
                                        )}
                                        {!shouldHideRawBubble && (
                                            <div className={`${styles.msgBubble} ${msg.role === 'user' ? styles.msgBubbleUser :
                                                msg.error ? styles.msgBubbleError : styles.msgBubbleBot
                                                }`}>
                                                {msg.error && <XCircle size={16} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'text-bottom' }} />}
                                                {msg.content}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'assistant' && systemPayload && systemPayload.action !== 'MATCH_INIT' && !hasToolCardForSystemPayload && (
                                        <div className={styles.toolResults}>
                                            <ChatCardRenderer
                                                data={systemPayload}
                                                onAction={handleSend}
                                                isLoading={isLoading}
                                            />
                                        </div>
                                    )}
                                    {msg.role === 'assistant' && msg.toolResults && renderToolResults(msg.toolResults, i)}
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className={styles.typingIndicator}>
                                <div className={`${styles.msgAvatar} ${styles.msgAvatarBot}`}>
                                    <BotIcon size={16} />
                                </div>
                                <div className={styles.typingDots}>
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className={styles.inputArea}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Hỏi gì đó... (vd: Tìm sân bóng đá)"
                            disabled={isLoading}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            aria-label="Gửi tin nhắn"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
