'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { ChevronDown, Send, X, Maximize2, Minimize2 } from 'lucide-react';
import { chatbotAPI, bookingsAPI } from '@/lib/api';
import VenueChatCard from '@/components/VenueChatCard';
import DatePicker from '@/components/ui/DatePicker';
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

/* ─── Mock Data ─── */
const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const MOCK_CONVERSATIONS = [
    {
        id: 1, type: 'user',
        name: 'Nguyễn Minh Khoa',
        avatar: null, initials: 'NK',
        lastMsg: 'Anh ơi sân Thứ 7 còn trống không ạ?',
        time: '10:42', unread: 2, online: true,
        avatarGradient: 'linear-gradient(135deg, #FF6E40, #D81B60)',
    },
    {
        id: 2, type: 'venue',
        name: 'Sân Cầu Lông Phú Nhuận',
        avatar: null, initials: 'SL',
        lastMsg: 'Sân đã xác nhận đặt lịch của bạn!',
        time: '09:15', unread: 0, online: true,
        avatarGradient: 'linear-gradient(135deg, #0066FF, #5E5CE6)',
    },
    {
        id: 3, type: 'user',
        name: 'Trần Thị Lan',
        avatar: null, initials: 'TL',
        lastMsg: 'OK nhé, tụi mình gặp lúc 7h sáng',
        time: 'Hôm qua', unread: 0, online: false,
        avatarGradient: 'linear-gradient(135deg, #F97316, #EF4444)',
    },
    {
        id: 4, type: 'user',
        name: 'Lê Văn Dũng',
        avatar: null, initials: 'LD',
        lastMsg: '😂 cười vỡ bụng với trận hôm qua',
        time: 'Hôm qua', unread: 0, online: true,
        avatarGradient: 'linear-gradient(135deg, #059669, #0EA5E9)',
    },
    {
        id: 5, type: 'venue',
        name: 'Sân Tennis Q7 Elite',
        avatar: null, initials: 'TN',
        lastMsg: 'Cảm ơn bạn đã đặt sân!',
        time: 'T4', unread: 0, online: false,
        avatarGradient: 'linear-gradient(135deg, #7C3AED, #D81B60)',
    },
    {
        id: 6, type: 'user',
        name: 'Phạm Thu Hiền',
        avatar: null, initials: 'PH',
        lastMsg: 'Đội mình cần thêm 1 người nữa nhé!',
        time: 'T3', unread: 0, online: false,
        avatarGradient: 'linear-gradient(135deg, #EC4899, #F97316)',
    },
];

const MOCK_MESSAGES = {
    1: [
        { id: 1, type: 'incoming', text: 'Chào bạn! Mình thấy bạn cũng hay chơi cầu lông ở khu vực Phú Nhuận nhỉ?', time: '10:20', read: true },
        { id: 2, type: 'outgoing', text: 'Ừ đúng rồi! Mình hay chơi ở sân Phú Nhuận. Bạn cũng vậy à?', time: '10:22', read: true },
        { id: 3, type: 'incoming', text: 'Đúng rồi! Tụi mình có đội thường xuyên chơi sáng Thứ 7, bạn có muốn tham gia không?', time: '10:24', read: true },
        { id: 4, type: 'outgoing', text: 'Nghe hay đó! Thứ 7 tụi mình đánh mấy giờ vậy?', time: '10:25', read: true },
        { id: 5, type: 'incoming', text: 'Thường là 7h-9h sáng. Trình độ vừa vừa thôi, chơi cho vui là chính 😄', time: '10:28', read: true },
        { id: 6, type: 'outgoing', text: 'Perfect! Mình level B thôi, không cao siêu gì đâu 😂', time: '10:30', read: true },
        { id: 7, type: 'incoming', text: 'Vậy thì hợp lắm! Mình sẽ add bạn vào group nhé?', time: '10:35', read: true },
        { id: 8, type: 'incoming', text: 'Anh ơi sân Thứ 7 còn trống không ạ?', time: '10:42', read: false },
    ],
    2: [
        { id: 1, type: 'incoming', text: 'Xin chào! Sân Cầu Lông Phú Nhuận rất vui được phục vụ bạn.', time: '09:00', read: true },
        { id: 2, type: 'outgoing', text: 'Cho mình hỏi, Thứ 7 tuần này còn sân từ 7h-9h không ạ?', time: '09:05', read: true },
        { id: 3, type: 'incoming', text: 'Dạ còn ạ! Hiện tại còn trống sân 1 và sân 3 khung giờ đó.', time: '09:08', read: true },
        { id: 4, type: 'incoming', text: 'Sân đã xác nhận đặt lịch của bạn!', time: '09:15', read: true, isVenueTag: true, venueName: 'Sân 1 – Thứ 7, 7:00 – 9:00' },
    ],
};

/* ─── Icons ─── */
const BotIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
);

/* ─── Avatar Component ─── */
function Avatar({ conv, size = 46 }) {
    const avatarSrc = conv?.avatar ? (conv.avatar.startsWith('http') ? conv.avatar : `${SERVER_URL}${conv.avatar}`) : null;
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

/* ─── Bot Tool Results ─── */
function BotToolResults({ 
    toolResults, onSend, isBotLoading,
    // Booking Form States & Handlers
    bookingDate, setBookingDate,
    paymentType, setPaymentType,
    paymentDropdownOpen, setPaymentDropdownOpen,
    paymentDropdownRef,
    availableSlots, selectedSlots,
    isLoadingSlots, handleSlotClick,
    selectedFieldId, setSelectedFieldId,
    fieldDropdownOpen, setFieldDropdownOpen,
    fieldDropdownRef,
    handleBookingSubmit
}) {
    if (!toolResults || toolResults.length === 0) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    return (
        <div className={styles.toolResults}>
            {toolResults.map((result, i) => {
                if (!result.data) return null;

                if ((result.type === 'options' || result.type === 'clarification') && (result.data.options || result.data.fields)) {
                    const options = result.data.fields || result.data.options;
                    return (
                        <div key={`clarification-${i}`} className={styles.optionsContainer}>
                            {options.map((opt, j) => {
                                const label = typeof opt === 'object' ? opt.name : opt;
                                const value = typeof opt === 'object' ? opt.id : opt;
                                return (
                                    <button
                                        key={j}
                                        className={styles.optionChip}
                                        onClick={() => onSend(value)}
                                        disabled={isBotLoading}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    );
                }

                if (result.type === 'venues' && Array.isArray(result.data)) {
                    return (
                        <div key={`venues-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {result.data.map((venue, j) => (
                                <VenueChatCard
                                    key={`venue-${i}-${j}`}
                                    venue={venue}
                                    onBookClick={(v) => onSend(`BOOK_VENUE: ${v.id}`)}
                                />
                            ))}
                        </div>
                    );
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, marginRight: 6}}>
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            📥 {result.data.filename}
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
                                        <PinIcon />
                                    </div>
                                    <div className={styles.bookingText}>
                                        <div className={styles.bookingLabel}>ĐỊA ĐIỂM</div>
                                        <div className={styles.bookingValue}>{result.data.venueName} - {result.data.fieldName}</div>
                                    </div>
                                </div>

                                <div className={styles.bookingItem}>
                                    <div className={styles.bookingIconWrapper}>
                                        <ClockIcon />
                                    </div>
                                    <div className={styles.bookingText}>
                                        <div className={styles.bookingLabel}>THỜI GIAN</div>
                                        <div className={styles.bookingValue}>{result.data.date} | {result.data.time}</div>
                                    </div>
                                </div>
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
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 12, height: 12, marginRight: 4}}>
                                                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                            </svg>
                                            {b.fieldName} · {b.time}
                                        </div>
                                        <div className={styles.miniBookingDetail}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 12, height: 12, marginRight: 4}}>
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
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
                        <div className={styles.bookingFormContainer} key={i}>
                            <div className={styles.formHeader}>
                                <div className={styles.formVenueInfo}>
                                    <h4 style={{margin: '0 0 4px 0', fontSize: '15px'}}>{venueName}</h4>
                                    {!availableFields && <div className={styles.formFieldBadge}>{fieldName}</div>}
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleBookingSubmit(activeFieldId); }}>
                                {availableFields && availableFields.length > 0 && (
                                    <div className={`${styles.formFullRow} ${fieldDropdownOpen ? styles.formRowActive : ''}`} style={{ marginBottom: '15px' }}>
                                        <div className={styles.formItem} ref={fieldDropdownRef}>
                                            <label className={styles.premiumLabel}>CHỌN SÂN</label>
                                            <div className={styles.customDropdown}>
                                                <div
                                                    className={`${styles.dropdownTrigger} ${fieldDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                                    onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
                                                >
                                                    <span>{activeFieldName}</span>
                                                    <ChevronDown size={14} className={`${styles.dropdownChevron} ${fieldDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
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

                                <div className={`${styles.formTwoColRow} ${paymentDropdownOpen ? styles.formRowActive : ''}`}>
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
                                                <span>{paymentType === 'DEPOSIT' ? 'Đặt cọc' : 'Trả đủ'}</span>
                                                <ChevronDown size={14} className={`${styles.dropdownChevron} ${paymentDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
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
                                                        Thanh toán đủ
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
                                    disabled={isBotLoading || selectedSlots.length === 0}
                                    style={{ marginTop: '20px' }}
                                >
                                    {isBotLoading ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
                                </button>
                            </form>
                        </div>
                    );
                }

                return null;
            })}
        </div>
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
    const isVenueSuggest = isSystem && msg.text.includes('"action":"VENUE_SUGGEST"');

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

        if (data.action === 'VENUE_SUGGEST') {
            return (
                <div className={`${styles.messageBubbleWrapper} ${isOut ? styles.outgoing : ''}`}>
                    {!isOut && <Avatar conv={conv} size={28} />}
                    <div className={styles.venueCard}>
                        <img 
                            src={data.venueImage || data.image || 'https://img.freepik.com/free-vector/stadium-background-design_1284-11883.jpg'} 
                            className={styles.venueCardImg} 
                            alt="Venue" 
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://img.freepik.com/free-vector/stadium-background-design_1284-11883.jpg';
                            }}
                        />
                        <div className={styles.venueCardContent}>
                            <h4 className={styles.venueCardTitle}>{data.venueName}</h4>
                            <span className={styles.venueCardAddress}>{data.address}</span>
                            <div className={styles.venueCardPrice}>~{Number(data.price).toLocaleString()}đ</div>
                        </div>
                        <div className={styles.venueCardActions}>
                            <button className={styles.viewDetailBtn} onClick={() => window.open(`/venues/${data.venueId}`, '_blank')}>Chi tiết</button>
                            {!isOut && (
                                <button className={styles.agreeBtn} onClick={() => onAction('accept_venue', msg.id)}>Đồng ý</button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (data.action === 'VENUE_ACCEPT') {
            return (
                <div className={styles.systemMessage}>
                    <div className={styles.acceptedBanner}>
                        <div className={styles.acceptedTitle}>✅ Đã chốt sân {data.venueName}!</div>
                        <p style={{ fontSize: '12px' }}>{data.acceptedBy} đã đồng ý với gợi ý này.</p>
                        <a href={`/venues/${data.venueId}`} className={styles.bookNowBtn}>Đặt sân ngay</a>
                    </div>
                </div>
            );
        }

        if (data.action === 'MATCH_INIT') {
            return null; // Don't show raw JSON for match initialization
        }

        return (
            <div className={styles.systemMessage}>
                <span className={styles.systemBadge}>{msg.text || (data.sportType ? `Bắt đầu ghép trận ${data.sportType}` : 'Thông báo hệ thống')}</span>
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
                            📍 {msg.venueName}
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
                        <div className={`${styles.bubble} ${isOut ? styles.outgoing : styles.incoming} ${msg.isBot ? styles.msgBubbleBot : ''}`}>
                            {msg.text}
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
                            {isOut && msg.read && ' ✓✓'}
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
            <div className={styles.typingDots}>
                <span />
                <span />
                <span />
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
                            <img src={v.images?.[0] || 'https://via.placeholder.com/64'} className={styles.modalVenueThumb} alt={v.name} />
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

const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" />
    </svg>
);

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
function ChatApp() {
    const [activeConvId, setActiveConvId] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isBotLoading, setIsBotLoading] = useState(false);
    const [botHistory, setBotHistory] = useState([]);
    
    const [matchInfo, setMatchInfo] = useState(null);
    const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
    const [suggestedVenues, setSuggestedVenues] = useState([]);
    const [isLoadingVenues, setIsLoadingVenues] = useState(false);
    
    const messagesEndRef = useRef(null);
    const composeRef = useRef(null);
    const socketRef = useRef(null);
    const myIdRef = useRef(null);

    const activeConv = conversations.find(c => c.id === activeConvId);
    const currentMsgs = activeConvId ? (messages[activeConvId] || []) : [];

    const filteredConvs = conversations.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === 'venues') return matchSearch && c.type === 'venue';
        if (activeTab === 'users') return matchSearch && c.type === 'user';
        return matchSearch;
    });

    const botConvs = filteredConvs.filter(c => c.type === 'bot');
    const userConvs = filteredConvs.filter(c => c.type === 'user');
    const venueConvs = filteredConvs.filter(c => c.type === 'venue');

    const searchParams = useSearchParams();
    const targetUserId = searchParams.get('user');

    // --- Chatbot Specific States ---
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
        if (selectedSlots.length === 0 || selectedSlots.length > 1) {
            setSelectedSlots([slot]);
            return;
        }
        const firstSlot = selectedSlots[0];
        if (firstSlot.time === slot.time) {
            setSelectedSlots([]);
            return;
        }
        const start = Math.min(firstSlot.minutes, slot.minutes);
        const end = Math.max(firstSlot.minutes, slot.minutes);
        const range = availableSlots.filter(s => s.minutes >= start && s.minutes <= end);
        if (range.some(s => s.booked)) {
            setSelectedSlots([slot]);
            return;
        }
        setSelectedSlots(range.sort((a, b) => a.minutes - b.minutes));
    };

    const handleBookingSubmit = async (fieldId) => {
        if (selectedSlots.length === 0) return;
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
        if (targetUserId) {
            const existing = conversations.find(c => c.targetUserId === targetUserId);
            if (existing) {
                setActiveConvId(existing.id);
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
                            roomType: room.type, // Added roomType here
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
                            type: m.senderId === targetUserId ? 'incoming' : 'outgoing',
                            text: m.content,
                            time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            read: m.isRead
                        }));

                        setConversations(prev => [newConv, ...prev.filter(c => c.id !== roomId)]);
                        setMessages(prev => ({ ...prev, [roomId]: formattedMsgs }));
                        setActiveConvId(roomId);
                    } catch (err) {
                        console.error('Failed to init real chat', err);
                    }
                });
            }
        }
    }, [targetUserId, conversations]);

    // Initialize socket connection (ONCE)
    useEffect(() => {
        const token = localStorage.getItem('sportapp_token');
        if (!token) return;

        const socket = io(SERVER_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on('new-message', (m) => {
            handleIncomingMessage(m);
        });

        socket.on('message-notification', (data) => {
            handleIncomingMessage(data.message);
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
                    text: m.content,
                    time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    read: m.isRead
                };

                // If it's a SYSTEM message in the active room, check for UI updates
                if (m.roomId === m.roomId && m.type === 'SYSTEM' && m.content.includes('MATCH_INIT')) {
                    try { setMatchInfo(JSON.parse(m.content)); } catch(e) {}
                }

                return { ...prev, [m.roomId]: [...arr, newMsg] };
            });

            setConversations(prev => prev.map(c => {
                if (c.id === m.roomId) {
                    const isIncoming = m.senderId !== myIdRef.current;
                    return {
                        ...c,
                        lastMsg: formatLastMsg(m.content, m.type),
                        time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        unread: (isIncoming && c.id !== activeConvId) ? (c.unread || 0) + 1 : (c.unread || 0)
                    };
                }
                return c;
            }));
        }

        return () => {
            socket.disconnect();
        };
    }, []); // Only on mount

    // Handle Join/Leave Room for Real-time
    useEffect(() => {
        if (!socketRef.current || !activeConvId) return;

        const socket = socketRef.current;
        socket.emit('join-room', activeConvId);

        return () => {
            socket.emit('leave-room', activeConvId);
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
                        online: true,
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
                        type: m.type === 'SYSTEM' ? 'system' : (m.senderId === myIdRef.current ? 'outgoing' : 'incoming'),
                        isOutgoing: m.senderId === myIdRef.current, // Added here too
                        text: m.content,
                        time: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        read: m.isRead
                    }));
                    setMessages(prev => ({ ...prev, [activeConvId]: formattedMsgs }));

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
    }, [activeConvId]);

    const handleAction = (action, data) => {
        if (action === 'accept_venue') {
            import('@/lib/api').then(({ chatAPI }) => {
                chatAPI.acceptVenueSuggestion(data).then(() => {
                    // Success, handled by socket event
                }).catch(e => alert("Không thể đồng ý gợi ý này."));
            });
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

    const handleSend = async (messageText) => {
        const msgText = typeof messageText === 'string' ? messageText : message.trim();
        if (!msgText || !activeConvId || !activeConv) return;
        setMessage('');

        if (activeConvId === CHATBOT_ID) {
            const userMsg = {
                id: Date.now(),
                type: 'outgoing',
                isOutgoing: true,
                text: msgText,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
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
                
                const res = await chatbotAPI.sendMessage(msgText, history);
                const data = res.data.data;
                
                console.log("[Chat Debug] Bot response received:", data);

                const botMsg = {
                    id: Date.now() + 1,
                    type: 'incoming',
                    isOutgoing: false,
                    text: data.message,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    isBot: true,
                    data: data // Store full response for complex rendering
                };

                setMessages(prev => ({ 
                    ...prev, 
                    [CHATBOT_ID]: [...(prev[CHATBOT_ID] || []), botMsg] 
                }));
                // Update history with raw strings for the API
                setBotHistory(prev => [...prev.slice(-4), { role: 'user', content: msgText }, { role: 'assistant', content: data.message }]);
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
                            </div>

                            {/* Match Banner if available */}
                            <MatchBanner 
                                info={matchInfo} 
                                roomType={activeConv.roomType} 
                                onSuggest={handleSuggestVenue} 
                            />

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
                                        paymentDropdownOpen, setPaymentDropdownOpen,
                                        paymentDropdownRef,
                                        availableSlots, selectedSlots,
                                        isLoadingSlots,
                                        selectedFieldId, setSelectedFieldId,
                                        fieldDropdownOpen, setFieldDropdownOpen,
                                        fieldDropdownRef
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
                            <div className={styles.composeBox}>
                                <div className={styles.composeInputWrapper}>
                                    <textarea
                                        ref={composeRef}
                                        className={styles.composeInput}
                                        placeholder={`Nhắn tin cho ${activeConv.name}...`}
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                    />
                                </div>
                                <button
                                    className={styles.sendBtn}
                                    onClick={handleSend}
                                    disabled={!message.trim()}
                                    title="Gửi"
                                >
                                    <SendIcon />
                                </button>
                            </div>
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
