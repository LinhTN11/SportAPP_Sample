'use client';

import { Download, MapPin, Calendar } from 'lucide-react';
import ChatCardRenderer from './ChatCardRenderer';
import BookingCreatedCard from './BookingCreatedCard';
import styles from '@/app/chat/chat.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BotToolResults({
    toolResults,
    onSend,
    isBotLoading,
    bookingFormStates = {},
    bookingDate,
    setBookingDate,
    paymentType,
    setPaymentType,
    availableSlots,
    selectedSlots,
    isLoadingSlots,
    handleSlotClick,
    selectedFieldId,
    setSelectedFieldId,
    handleBookingSubmit,
}) {
    if (!toolResults || toolResults.length === 0) return null;

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    const resolvedBookingFormStates = {
        bookingDate: bookingFormStates.bookingDate ?? bookingDate,
        setBookingDate: bookingFormStates.setBookingDate ?? setBookingDate,
        paymentType: bookingFormStates.paymentType ?? paymentType,
        setPaymentType: bookingFormStates.setPaymentType ?? setPaymentType,
        selectedFieldId: bookingFormStates.selectedFieldId ?? selectedFieldId,
        setSelectedFieldId: bookingFormStates.setSelectedFieldId ?? setSelectedFieldId,
        selectedSlots: bookingFormStates.selectedSlots ?? selectedSlots,
        handleSlotClick: bookingFormStates.handleSlotClick ?? handleSlotClick,
        availableSlots: bookingFormStates.availableSlots ?? availableSlots,
        isLoadingSlots: bookingFormStates.isLoadingSlots ?? isLoadingSlots,
        handleBookingSubmit: bookingFormStates.handleBookingSubmit ?? handleBookingSubmit,
    };

    return (
        <div className={styles.toolResults}>
            {toolResults.map((result, i) => {
                if (!result.data) return null;

                if (['options', 'clarification', 'venues', 'booking_form', 'available_slots', 'booking_cancelled', 'weather'].includes(result.type)) {
                    return (
                        <ChatCardRenderer
                            key={`shared-${result.type}-${i}`}
                            type={result.type}
                            data={result.data}
                            isLoading={isBotLoading}
                            onAction={onSend}
                            bookingFormStates={resolvedBookingFormStates}
                        />
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
                            <Download size={14} style={{ marginRight: 6 }} />
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
                        <BookingCreatedCard key={`booking-${i}`} data={result.data} />
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
                                <div key={j} className={styles.bookingCard}>
                                    <div className={styles.bookingHeader}>
                                        <span className={styles.bookingStatus} style={{ color: statusColors[b.status] || '#718096' }}>
                                            {statusLabels[b.status] || b.status}
                                        </span>
                                    </div>
                                    <div className={styles.bookingGrid}>
                                        <div className={styles.bookingItem}>
                                            <div className={styles.bookingIconWrapper}>
                                                <MapPin size={14} />
                                            </div>
                                            <div className={styles.bookingText}>
                                                <div className={styles.bookingLabel}>SÂN</div>
                                                <div className={styles.bookingValue}>{b.venueName} - {b.fieldName}</div>
                                            </div>
                                        </div>
                                        <div className={styles.bookingItem}>
                                            <div className={styles.bookingIconWrapper}>
                                                <Calendar size={14} />
                                            </div>
                                            <div className={styles.bookingText}>
                                                <div className={styles.bookingLabel}>NGÀY</div>
                                                <div className={styles.bookingValue}>{b.date}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
