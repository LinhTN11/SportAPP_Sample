'use client';

import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import styles from './BookingCreatedCard.module.css';

export default function BookingCreatedCard({ data }) {
    if (!data) return null;

    const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

    return (
        <div className={styles.bookingCreatedCard}>
            <div className={styles.bookingCreatedHeader}>
                <CheckCircle2 size={18} className={styles.bookingCreatedIcon} />
                <span>ĐẶT SÂN THÀNH CÔNG!</span>
            </div>

            <div className={styles.bookingCreatedGrid}>
                <div className={styles.bookingCreatedItem}>
                    <div className={styles.bookingCreatedLabel}>ĐỊA ĐIỂM</div>
                    <div className={styles.bookingCreatedValue}>
                        <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {data.venueName || '-'}{data.fieldName ? ` - ${data.fieldName}` : ''}
                    </div>
                </div>

                <div className={styles.bookingCreatedItem}>
                    <div className={styles.bookingCreatedLabel}>THỜI GIAN</div>
                    <div className={styles.bookingCreatedValue}>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {data.date || '-'} | {data.time || '-'}
                    </div>
                </div>

                {data.totalPrice != null && (
                    <div className={styles.bookingCreatedItem}>
                        <div className={styles.bookingCreatedLabel}>CHI PHÍ</div>
                        <div className={styles.bookingCreatedValue}>{formatPrice(data.totalPrice)}</div>
                    </div>
                )}

                {data.bookingId && (
                    <div className={styles.bookingCreatedItem}>
                        <div className={styles.bookingCreatedLabel}>BOOKING_ID</div>
                        <div className={styles.bookingCreatedValue}>{data.bookingId}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
