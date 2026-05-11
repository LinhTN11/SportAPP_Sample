/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI, reviewsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CalendarDays, Clock, Wallet, X, Star, Send, MessageSquare, Sparkles, Calendar, Building2 } from 'lucide-react';
import styles from './bookings.module.css';
import PaymentQRModal from '@/components/PaymentQR/PaymentQRModal';
import CountdownTimer from '@/components/PaymentQR/CountdownTimer';

export default function BookingsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [paymentBooking, setPaymentBooking] = useState(null);

    // Review state
    const [showReviewModal, setShowReviewModal] = useState(null); // bookingId
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewDone, setReviewDone] = useState(false);

    const RATING_LABELS = {
        1: 'Rất tệ',
        2: 'Tệ',
        3: 'Bình thường',
        4: 'Tốt',
        5: 'Tuyệt vời',
    };
    const activeRating = hoveredStar || rating;

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
            // "Đã xác nhận" tab shows both CONFIRMED and COMPLETED
            if (filter && filter !== 'CONFIRMED') params.status = filter;
            const { data } = await bookingsAPI.getMyBookings(params);
            let result = data.data.bookings;
            if (filter === 'CONFIRMED') {
                result = result.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED');
            }
            setBookings(result);
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
        if (rating === 0) return;
        setReviewSubmitting(true);
        try {
            await reviewsAPI.create({
                bookingId: showReviewModal,
                rating,
                comment,
            });
            setReviewDone(true);
            setTimeout(() => {
                setShowReviewModal(null);
                setRating(5);
                setHoveredStar(5);
                setComment('');
                setReviewDone(false);
                loadBookings();
            }, 2000);
        } catch (err) {
            alert(err.response?.data?.message || 'Đánh giá thất bại');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const closeReviewModal = () => {
        setShowReviewModal(null);
        setRating(0);
        setHoveredStar(0);
        setComment('');
        setReviewDone(false);
    };
    const handlePaymentConfirm = async (bookingId) => {
        await bookingsAPI.confirm(bookingId);
        loadBookings();
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
                    {['', 'PENDING_DEPOSIT', 'CONFIRMED', 'CANCELLED'].map((s) => (
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
                                <div className={styles.skeletonImg} />
                                <div className={styles.skeletonBody}>
                                    <div className="skeleton" style={{ height: 20, width: '45%' }} />
                                    <div className="skeleton" style={{ height: 14, width: '30%' }} />
                                    <div className="skeleton" style={{ height: 14, width: '60%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Calendar size={48} color="#D1D5DB" /></div>
                        <div className="empty-state-title">Chưa có đặt sân nào</div>
                        <div className="empty-state-text">Bắt đầu tìm sân và đặt ngay!</div>
                        <button className="btn btn-primary" onClick={() => router.push('/venues')}>
                            Tìm sân →
                        </button>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {bookings.map((booking) => {
                            const isCancelled = booking.status === 'CANCELLED' || booking.status === 'EXPIRED';
                            const venueImages = booking.field?.venue?.images;
                            const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                            const imgSrc = venueImages?.length > 0 ? `${SERVER_URL}${venueImages[0]}` : null;
                            return (
                                <div key={booking.id} className={styles.bookingCard}>
                                    {/* Venue Image */}
                                    {imgSrc ? (
                                        <div className={styles.cardImage}>
                                            <img src={imgSrc} alt={booking.field?.venue?.name} />
                                        </div>
                                    ) : (
                                        <div className={styles.imagePlaceholder}><Building2 size={24} color="#9CA3AF" /></div>
                                    )}

                                    {/* Card Body */}
                                    <div className={styles.cardBody}>
                                        <div className={styles.bookingHeader}>
                                            <div>
                                                <h3 className={styles.venueName}>{booking.field?.venue?.name}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                                                    <p className={styles.fieldName} style={{ margin: 0 }}>{booking.field?.name}</p>
                                                    {booking.status === 'PENDING_DEPOSIT' && booking.holdExpiresAt && (
                                                        <CountdownTimer
                                                            expiresAt={booking.holdExpiresAt}
                                                            onExpired={() => {
                                                                alert('Đặt chỗ đã hết hạn! Vui lòng đặt lại.');
                                                                loadBookings();
                                                            }} />)}</div>
                                            </div>
                                            <span className={`badge ${statusMap[booking.status]?.class}`}>
                                                {statusMap[booking.status]?.label}
                                            </span>
                                        </div>

                                        <div className={styles.bookingDetails}>
                                            <div className={styles.detailItem}>
                                                <CalendarDays size={15} color="#FF6E40" />
                                                <span>{new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <Clock size={15} color="#FF6E40" />
                                                <span>{booking.startTime} - {booking.endTime}</span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <Wallet size={15} color={isCancelled ? '#9CA3AF' : '#FF6E40'} />
                                                <span className={isCancelled ? styles.detailPriceCancelled : styles.detailPrice}>
                                                    {Number(booking.totalPrice).toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </div>

                                        {['PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED'].includes(booking.status) && (
                                            <div className={styles.bookingActions}>
                                                {booking.status === 'PENDING_DEPOSIT' && (
                                                    <button className={styles.btnPay} onClick={() => setPaymentBooking(booking)}>
                                                        Thanh toán →
                                                    </button>
                                                )}
                                                {['CONFIRMED', 'COMPLETED'].includes(booking.status) && !booking.review && (
                                                    <button className={styles.btnReview} onClick={() => setShowReviewModal(booking.id)}>
                                                        <Star size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Đánh giá
                                                    </button>
                                                )}
                                                {booking.status === 'PENDING_DEPOSIT' && (
                                                    <button className={styles.btnCancel} onClick={() => handleCancel(booking.id)}>
                                                        Hủy đặt sân
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {paymentBooking && (
                    <PaymentQRModal
                        booking={paymentBooking}
                        onClose={() => setPaymentBooking(null)}
                        onConfirm={handlePaymentConfirm}
                        paymentType={paymentBooking.paymentMethod === 'ONLINE' ? 'full' : 'deposit'} />)}

                {/* Review Modal */}
                {showReviewModal && (
                    <div className={styles.reviewOverlay} onClick={closeReviewModal}>
                        <div className={styles.reviewModal} onClick={(e) => e.stopPropagation()}>
                            {/* Decorative gradient */}
                            <div className={styles.reviewGradientTop} />

                            {reviewDone ? (
                                /* ── Success ── */
                                <div className={styles.reviewSuccess}>
                                    <div className={styles.reviewSuccessRing}>
                                        <Sparkles size={36} color="#F59E0B" strokeWidth={1.8} />
                                    </div>
                                    <p className={styles.reviewSuccessTitle}>Cảm ơn bạn!</p>
                                    <p className={styles.reviewSuccessSub}>Đánh giá của bạn đã được gửi thành công</p>
                                    <div className={styles.reviewSuccessStars}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={22} fill={s <= rating ? '#F59E0B' : 'none'} color={s <= rating ? '#F59E0B' : '#E2E8F0'} strokeWidth={1.5} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* ── Form ── */
                                <>
                                    <div className={styles.reviewHeader}>
                                        <div className={styles.reviewHeaderLeft}>
                                            <div className={styles.reviewHeaderIcon}>
                                                <Star size={18} fill="#F59E0B" color="#F59E0B" />
                                            </div>
                                            <div>
                                                <h2 className={styles.reviewHeaderTitle}>Đánh giá trải nghiệm</h2>
                                                <p className={styles.reviewHeaderSub}>Chia sẻ cảm nhận của bạn</p>
                                            </div>
                                        </div>
                                        <button className={styles.reviewCloseBtn} onClick={closeReviewModal}>
                                            <X size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleReviewSubmit} className={styles.reviewBody}>
                                        {/* Stars */}
                                        <div className={styles.reviewRatingSection}>
                                            <p className={styles.reviewRatingPrompt}>Bạn cảm thấy thế nào?</p>
                                            <div className={styles.reviewStarsRow}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        className={`${styles.reviewStarBtn} ${star <= activeRating ? styles.reviewStarActive : ''}`}
                                                        onClick={() => setRating(star)}
                                                        onMouseEnter={() => setHoveredStar(star)}
                                                        onMouseLeave={() => setHoveredStar(0)}
                                                    >
                                                        <Star
                                                            size={38}
                                                            fill={star <= activeRating ? '#F59E0B' : 'none'}
                                                            color={star <= activeRating ? '#F59E0B' : '#CBD5E1'}
                                                            strokeWidth={1.5}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className={`${styles.reviewRatingLabel} ${activeRating > 0 ? styles.reviewRatingLabelVisible : ''}`}>
                                                <span className={styles.reviewRatingBadge}>
                                                    {RATING_LABELS[activeRating] || 'Chọn số sao'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.reviewDivider} />

                                        {/* Comment */}
                                        <div className={styles.reviewCommentSection}>
                                            <label className={styles.reviewCommentLabel}>
                                                <MessageSquare size={14} />
                                                <span>Chia sẻ chi tiết hơn</span>
                                                <span className={styles.reviewOptional}>(tùy chọn)</span>
                                            </label>
                                            <div className={styles.reviewTextareaWrap}>
                                                <textarea
                                                    className={styles.reviewTextarea}
                                                    placeholder="Sân rộng, sạch sẽ, nhân viên thân thiện..."
                                                    rows={4}
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    maxLength={500}
                                                />
                                                <span className={styles.reviewCharCount}>{comment.length}/500</span>
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            className={styles.reviewSubmitBtn}
                                            disabled={reviewSubmitting || rating === 0}
                                        >
                                            {reviewSubmitting ? (
                                                <><span className={styles.reviewSpinner} /> Đang gửi...</>
                                            ) : (
                                                <><Send size={16} /> Gửi đánh giá</>
                                            )}
                                        </button>

                                        {rating === 0 && (
                                            <p className={styles.reviewHint}>Vui lòng chọn số sao để gửi đánh giá</p>
                                        )}
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
