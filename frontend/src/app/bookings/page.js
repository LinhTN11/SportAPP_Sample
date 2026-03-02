'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI, reviewsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './bookings.module.css';

export default function BookingsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    // Review state
    const [showReviewModal, setShowReviewModal] = useState(null); // bookingId
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }
        if (isAuthenticated) loadBookings();
    }, [isAuthenticated, authLoading, filter]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter) params.status = filter;
            const { data } = await bookingsAPI.getMyBookings(params);
            setBookings(data.data.bookings);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!confirm('Bạn có chắc muốn hủy đặt sân? Phí cọc sẽ không được hoàn lại.')) return;
        try {
            await bookingsAPI.cancel(id);
            loadBookings();
        } catch (err) {
            alert(err.response?.data?.message || 'Hủy thất bại');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setReviewSubmitting(true);
        try {
            await reviewsAPI.create({
                bookingId: showReviewModal,
                rating,
                comment,
            });
            setShowReviewModal(null);
            setRating(5);
            setComment('');
            loadBookings();
        } catch (err) {
            alert(err.response?.data?.message || 'Đánh giá thất bại');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const statusMap = {
        PENDING_DEPOSIT: { label: 'Chờ cọc', class: 'badge-warning' },
        CONFIRMED: { label: 'Đã xác nhận', class: 'badge-success' },
        COMPLETED: { label: 'Hoàn thành', class: 'badge-neutral' },
        CANCELLED: { label: 'Đã hủy', class: 'badge-danger' },
        EXPIRED: { label: 'Hết hạn', class: 'badge-neutral' },
    };

    return (
        <div className={styles.page}>
            <div className="container">
                <h1 className="heading-lg">Đặt sân của tôi</h1>

                <div className={styles.filters}>
                    {['', 'PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
                        <button
                            key={s}
                            className={`tab ${filter === s ? 'active' : ''}`}
                            onClick={() => setFilter(s)}
                        >
                            {s === '' ? 'Tất cả' : statusMap[s]?.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.list}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonCard}>
                                <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 16, width: '30%' }} />
                            </div>
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <div className="empty-state-title">Chưa có đặt sân nào</div>
                        <div className="empty-state-text">Bắt đầu tìm sân và đặt ngay!</div>
                        <button className="btn btn-primary" onClick={() => router.push('/venues')}>
                            Tìm sân →
                        </button>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {bookings.map((booking) => (
                            <div key={booking.id} className={styles.bookingCard}>
                                <div className={styles.bookingHeader}>
                                    <div>
                                        <h3 className={styles.venueName}>{booking.field?.venue?.name}</h3>
                                        <p className={styles.fieldName}>{booking.field?.name}</p>
                                    </div>
                                    <span className={`badge ${statusMap[booking.status]?.class}`}>
                                        {statusMap[booking.status]?.label}
                                    </span>
                                </div>

                                <div className={styles.bookingDetails}>
                                    <div className={styles.detailItem}>
                                        <span>📅</span>
                                        <span>{new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span>🕐</span>
                                        <span>{booking.startTime} - {booking.endTime}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span>💰</span>
                                        <span>{Number(booking.totalPrice).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </div>

                                {['PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED'].includes(booking.status) && (
                                    <div className={styles.bookingActions}>
                                        {booking.status === 'PENDING_DEPOSIT' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => router.push(`/venues/${booking.field?.venue?.id}`)}>
                                                Thanh toán →
                                            </button>
                                        )}
                                        {['CONFIRMED', 'COMPLETED'].includes(booking.status) && !booking.review && (
                                            <button className="btn btn-primary btn-sm" onClick={() => setShowReviewModal(booking.id)}>
                                                ⭐ Đánh giá
                                            </button>
                                        )}
                                        {['PENDING_DEPOSIT', 'CONFIRMED'].includes(booking.status) && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(booking.id)}>
                                                Hủy đặt sân
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Review Modal */}
                {showReviewModal && (
                    <div className="modal-overlay" onClick={() => setShowReviewModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div className="modal-header">
                                <h2 className="heading-sm">Đánh giá sân</h2>
                                <button className="modal-close" onClick={() => setShowReviewModal(null)}>×</button>
                            </div>
                            <form onSubmit={handleReviewSubmit}>
                                <div className="form-group" style={{ textAlign: 'center', margin: '24px 0' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            style={{
                                                fontSize: 32,
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: star <= rating ? 'gold' : 'var(--border)',
                                                transition: '0.2s',
                                            }}
                                        >
                                            ★
                                        </button>
                                    ))}
                                    <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                        {rating} sao
                                    </div>
                                </div>
                                <div className="form-group">
                                    <textarea
                                        className="form-input"
                                        placeholder="Chia sẻ trải nghiệm của bạn (không bắt buộc)..."
                                        rows={4}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={reviewSubmitting}>
                                    {reviewSubmitting ? <span className="spinner" /> : 'Gửi đánh giá'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
