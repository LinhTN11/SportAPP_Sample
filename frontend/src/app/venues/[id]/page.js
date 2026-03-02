'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { venuesAPI, bookingsAPI, paymentsAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import styles from './detail.module.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function VenueDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [heroIdx, setHeroIdx] = useState(0);

    // Booking form state
    const [bookingForm, setBookingForm] = useState({
        fieldId: '',
        bookingDate: '',
        startTime: '',
        endTime: '',
        paymentMethod: 'DIRECT',
    });
    const [calculatedPrice, setCalculatedPrice] = useState(null);
    const [bookingStep, setBookingStep] = useState('select'); // select | review | pay | done
    const [currentBooking, setCurrentBooking] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);

    // Fetch booked slots when field + date change
    useEffect(() => {
        if (bookingForm.fieldId && bookingForm.bookingDate) {
            bookingsAPI.getFieldSlots(bookingForm.fieldId, bookingForm.bookingDate)
                .then(({ data }) => setBookedSlots(data.data.bookedSlots || []))
                .catch(() => setBookedSlots([]));
        } else {
            setBookedSlots([]);
        }
    }, [bookingForm.fieldId, bookingForm.bookingDate]);

    // Check if a given hour is blocked by an existing booking
    const isHourBooked = (hour) => {
        const hMins = hour * 60;
        return bookedSlots.some(slot => {
            const [sh] = slot.startTime.split(':').map(Number);
            const [eh] = slot.endTime.split(':').map(Number);
            return hMins >= sh * 60 && hMins < eh * 60;
        });
    };

    // Check if range [startH, endH) overlaps any booked slot
    const rangeOverlapsBooking = (startH, endH) => {
        const sMins = startH * 60;
        const eMins = endH * 60;
        return bookedSlots.some(slot => {
            const [sh] = slot.startTime.split(':').map(Number);
            const [eh] = slot.endTime.split(':').map(Number);
            return sMins < eh * 60 && eMins > sh * 60;
        });
    };

    // Get the minimum start hour (for today, next full hour)
    const getMinStartHour = () => {
        if (!bookingForm.bookingDate) return 0;
        const today = new Date();
        const selected = new Date(bookingForm.bookingDate);
        if (selected.toDateString() === today.toDateString()) {
            return today.getHours() + 1; // next full hour
        }
        return 0;
    };

    useEffect(() => {
        loadVenue();
    }, [id]);

    const loadVenue = async () => {
        try {
            const { data } = await venuesAPI.getById(id);
            setVenue(data.data.venue);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldSelect = (fieldId) => {
        setBookingForm({ ...bookingForm, fieldId, startTime: '', endTime: '' });
        setBookedSlots([]);
        setError('');
    };

    const handleBookingSubmit = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            const { data } = await bookingsAPI.create(bookingForm);
            setCurrentBooking(data.data);
            setCalculatedPrice(data.data.payment);
            setBookingStep('review');
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tạo đặt sân');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayment = async () => {
        setSubmitting(true);
        setError('');
        try {
            await paymentsAPI.mockPay({
                bookingId: currentBooking.booking.id,
                method: 'MOCK_VNPAY',
                simulateSuccess: true,
            });
            setBookingStep('done');
        } catch (err) {
            setError(err.response?.data?.message || 'Thanh toán thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container">
                    <div className="skeleton" style={{ height: 300, borderRadius: 20, marginBottom: 24 }} />
                    <div className="skeleton" style={{ height: 40, width: '50%', marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 20, width: '30%' }} />
                </div>
            </div>
        );
    }

    if (!venue) {
        return (
            <div className={styles.page}>
                <div className="container">
                    <div className="empty-state">
                        <div className="empty-state-icon">😢</div>
                        <div className="empty-state-title">Không tìm thấy sân</div>
                    </div>
                </div>
            </div>
        );
    }

    const selectedField = venue.fields?.find(f => f.id === bookingForm.fieldId);
    const venueImages = venue.images || [];

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.layout}>
                    {/* Left: Venue Info */}
                    <div className={styles.venueInfo}>
                        {/* Hero - Images or Placeholder */}
                        <div className={styles.hero}>
                            {venueImages.length > 0 ? (
                                <>
                                    <img
                                        src={`${SERVER_URL}${venueImages[heroIdx]}`}
                                        alt={venue.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    {venueImages.length > 1 && (
                                        <div className={styles.heroNav}>
                                            <button onClick={() => setHeroIdx(i => (i - 1 + venueImages.length) % venueImages.length)} className={styles.heroNavBtn}>‹</button>
                                            <span style={{ color: '#fff', fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{heroIdx + 1} / {venueImages.length}</span>
                                            <button onClick={() => setHeroIdx(i => (i + 1) % venueImages.length)} className={styles.heroNavBtn}>›</button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.heroPlaceholder}>
                                    {venue.sportTypes?.[0] === 'football' ? '⚽' : '🏟️'}
                                </div>
                            )}
                        </div>

                        <div className={styles.venueHeader}>
                            <h1 className="heading-lg">{venue.name}</h1>
                            <p className={styles.address}>📍 {venue.address}, {venue.district}, {venue.city}</p>

                            <div className={styles.meta}>
                                <div className={styles.rating}>
                                    <span className="stars">{'★'.repeat(Math.round(venue.avgRating || 0))}</span>
                                    <strong>{venue.avgRating?.toFixed(1) || '—'}</strong>
                                    <span className="caption">({venue.reviewCount || 0} đánh giá)</span>
                                </div>
                                {venue.openTime && (
                                    <span className="badge badge-success">🕐 {venue.openTime} - {venue.closeTime}</span>
                                )}
                            </div>
                        </div>

                        {venue.description && (
                            <div className={styles.section}>
                                <h2 className="heading-sm">Giới thiệu</h2>
                                <p className={styles.description}>{venue.description}</p>
                            </div>
                        )}

                        {/* Map Location */}
                        {venue.latitude && venue.longitude && (
                            <div className={styles.section}>
                                <h2 className="heading-sm">📍 Vị trí sân</h2>
                                <MapPicker
                                    value={{
                                        latitude: parseFloat(venue.latitude),
                                        longitude: parseFloat(venue.longitude),
                                        fullAddress: `${venue.address}, ${venue.district}, ${venue.city}`,
                                    }}
                                    readOnly={true}
                                    height={250}
                                />
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-ghost"
                                    style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
                                >
                                    🧭 Chỉ đường đến sân (Google Maps)
                                </a>
                            </div>
                        )}

                        {/* Fields List */}
                        <div className={styles.section}>
                            <h2 className="heading-sm">Danh sách sân ({venue.fields?.length || 0})</h2>
                            <div className={styles.fieldGrid}>
                                {venue.fields?.map((field) => (
                                    <button
                                        key={field.id}
                                        className={`${styles.fieldCard} ${bookingForm.fieldId === field.id ? styles.fieldSelected : ''}`}
                                        onClick={() => handleFieldSelect(field.id)}
                                    >
                                        <div className={styles.fieldIcon}>
                                            {field.fieldType === 'COMBINED' ? '🏟️' : '⚽'}
                                        </div>
                                        <div className={styles.fieldInfo}>
                                            <h4>{field.name}</h4>
                                            <span className="caption">
                                                {field.sportType} • {field.capacity ? `${field.capacity} người` : ''}
                                                {field.fieldType === 'COMBINED' && ' • Sân ghép'}
                                            </span>
                                        </div>
                                        {field.pricingRules?.length > 0 && (
                                            <div className={styles.fieldPrice}>
                                                {Number(field.pricingRules[0].price).toLocaleString('vi-VN')}đ/h
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pricing table for selected field */}
                        {selectedField && selectedField.pricingRules?.length > 0 && (
                            <div className={styles.section}>
                                <h2 className="heading-sm">Bảng giá — {selectedField.name}</h2>
                                <div className={styles.priceTable}>
                                    {selectedField.pricingRules.map((rule) => (
                                        <div key={rule.id} className={styles.priceRow}>
                                            <div>
                                                <strong>{rule.label || 'Khung giờ'}</strong>
                                                <span className="caption"> {rule.startTime} - {rule.endTime}</span>
                                            </div>
                                            <strong className={styles.priceValue}>
                                                {Number(rule.price).toLocaleString('vi-VN')}đ/h
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        {venue.reviews?.length > 0 && (
                            <div className={styles.section}>
                                <h2 className="heading-sm">Đánh giá gần đây</h2>
                                <div className={styles.reviews}>
                                    {venue.reviews.map((review) => (
                                        <div key={review.id} className={styles.reviewCard}>
                                            <div className={styles.reviewHeader}>
                                                <Avatar user={review.user} size="sm" />
                                                <div>
                                                    <strong className="body-sm">{review.user.fullName}</strong>
                                                    <div className="stars body-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                                                </div>
                                            </div>
                                            {review.comment && <p className={styles.reviewText}>{review.comment}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Booking Panel */}
                    <div className={styles.bookingPanel}>
                        <div className={styles.bookingCard}>
                            {bookingStep === 'select' && (
                                <>
                                    <h2 className="heading-sm">Đặt sân</h2>
                                    <p className="caption" style={{ marginBottom: 20 }}>Chọn sân, ngày giờ và thanh toán</p>

                                    {!bookingForm.fieldId && (
                                        <div className={styles.hint}>👈 Chọn sân ở danh sách bên trái</div>
                                    )}

                                    {bookingForm.fieldId && (
                                        <>
                                            <div className={styles.selectedInfo}>
                                                ✅ {selectedField?.name}
                                            </div>

                                            {/* Date Picker - Calendar */}
                                            <div className="form-group">
                                                <label className="form-label">Ngày chơi</label>
                                                {(() => {
                                                    const today = new Date();
                                                    const selectedDate = bookingForm.bookingDate ? new Date(bookingForm.bookingDate) : null;

                                                    // Calendar month state via a simple approach
                                                    const calMonth = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                                                        : new Date(today.getFullYear(), today.getMonth(), 1);

                                                    const year = calMonth.getFullYear();
                                                    const month = calMonth.getMonth();
                                                    const firstDay = new Date(year, month, 1).getDay(); // 0=CN
                                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                                                        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

                                                    const cells = [];
                                                    // empty cells before first day
                                                    for (let i = 0; i < firstDay; i++) cells.push(null);
                                                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                                                    return (
                                                        <div className={styles.calendar}>
                                                            <div className={styles.calHeader}>
                                                                <button type="button" className={styles.calNav}
                                                                    onClick={() => {
                                                                        const prev = new Date(year, month - 1, 1);
                                                                        if (prev >= new Date(today.getFullYear(), today.getMonth(), 1)) {
                                                                            setBookingForm({ ...bookingForm, bookingDate: prev.toISOString().split('T')[0] });
                                                                        }
                                                                    }}>‹</button>
                                                                <strong>{monthNames[month]} {year}</strong>
                                                                <button type="button" className={styles.calNav}
                                                                    onClick={() => {
                                                                        const next = new Date(year, month + 1, 1);
                                                                        setBookingForm({ ...bookingForm, bookingDate: next.toISOString().split('T')[0] });
                                                                    }}>›</button>
                                                            </div>
                                                            <div className={styles.calGrid}>
                                                                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                                                                    <div key={d} className={styles.calDayName}>{d}</div>
                                                                ))}
                                                                {cells.map((day, idx) => {
                                                                    if (!day) return <div key={`e-${idx}`} />;
                                                                    const date = new Date(year, month, day);
                                                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                                    const isToday = date.toDateString() === today.toDateString();
                                                                    const isSelected = bookingForm.bookingDate === dateStr;

                                                                    return (
                                                                        <button
                                                                            key={dateStr}
                                                                            type="button"
                                                                            disabled={isPast}
                                                                            className={`${styles.calDay} ${isSelected ? styles.calDayActive : ''} ${isToday ? styles.calDayToday : ''} ${isPast ? styles.calDayDisabled : ''}`}
                                                                            onClick={() => setBookingForm({ ...bookingForm, bookingDate: dateStr, startTime: '', endTime: '' })}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Time Frame Picker - Based on pricing rules */}
                                            {bookingForm.bookingDate && selectedField?.pricingRules?.length > 0 && (
                                                <div className="form-group">
                                                    <label className="form-label">Chọn giờ</label>
                                                    <div className={styles.timeSelectors}>
                                                        <div className={styles.timePicker}>
                                                            <span className={styles.timeLabel}>Bắt đầu</span>
                                                            <select
                                                                className={styles.timeSelect}
                                                                value={bookingForm.startTime}
                                                                onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value, endTime: '' })}
                                                            >
                                                                <option value="">-- Chọn --</option>
                                                                {(() => {
                                                                    const openH = parseInt(venue.openTime?.split(':')[0] || '6');
                                                                    const closeH = parseInt(venue.closeTime?.split(':')[0] || '23');
                                                                    const minH = getMinStartHour();
                                                                    const opts = [];
                                                                    for (let h = Math.max(openH, minH); h < closeH; h++) {
                                                                        const booked = isHourBooked(h);
                                                                        opts.push(
                                                                            <option key={h} value={`${String(h).padStart(2, '0')}:00`} disabled={booked}>
                                                                                {`${String(h).padStart(2, '0')}:00`}{booked ? ' (đã đặt)' : ''}
                                                                            </option>
                                                                        );
                                                                    }
                                                                    return opts;
                                                                })()}
                                                            </select>
                                                        </div>
                                                        <span className={styles.timeArrow}>→</span>
                                                        <div className={styles.timePicker}>
                                                            <span className={styles.timeLabel}>Kết thúc</span>
                                                            <select
                                                                className={styles.timeSelect}
                                                                value={bookingForm.endTime}
                                                                onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                                                                disabled={!bookingForm.startTime}
                                                            >
                                                                <option value="">-- Chọn --</option>
                                                                {(() => {
                                                                    if (!bookingForm.startTime) return [];
                                                                    const [sh, sm] = bookingForm.startTime.split(':').map(Number);
                                                                    const startMins = sh * 60 + sm;
                                                                    const closeH = parseInt(venue.closeTime?.split(':')[0] || '23');
                                                                    const opts = [];
                                                                    for (let m = startMins + 60; m <= closeH * 60; m += 60) {
                                                                        const h = Math.floor(m / 60);
                                                                        const t = `${String(h).padStart(2, '0')}:00`;
                                                                        const durH = (m - startMins) / 60;
                                                                        const startH = startMins / 60;
                                                                        const conflict = rangeOverlapsBooking(startH, h);
                                                                        opts.push(
                                                                            <option key={t} value={t} disabled={conflict}>
                                                                                {t} ({durH}h){conflict ? ' (trùng lịch)' : ''}
                                                                            </option>
                                                                        );
                                                                    }
                                                                    return opts;
                                                                })()}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Price Preview */}
                                            {bookingForm.bookingDate && bookingForm.startTime && bookingForm.endTime && selectedField?.pricingRules?.length > 0 && (
                                                <div className={styles.pricePreview}>
                                                    <div className={styles.pricePreviewHeader}>💰 Chi phí dự kiến</div>
                                                    {(() => {
                                                        const [sh, sm] = bookingForm.startTime.split(':').map(Number);
                                                        const [eh, em] = bookingForm.endTime.split(':').map(Number);
                                                        const startMins = sh * 60 + sm;
                                                        const endMins = eh * 60 + em;
                                                        const totalHours = (endMins - startMins) / 60;
                                                        let totalPrice = 0;
                                                        const breakdown = [];

                                                        // Calculate price across pricing rule brackets
                                                        selectedField.pricingRules.forEach(rule => {
                                                            const [rsh, rsm] = rule.startTime.split(':').map(Number);
                                                            const [reh, rem] = rule.endTime.split(':').map(Number);
                                                            const rStart = rsh * 60 + rsm;
                                                            const rEnd = reh * 60 + rem;
                                                            const overlap = Math.max(0, Math.min(endMins, rEnd) - Math.max(startMins, rStart));
                                                            if (overlap > 0) {
                                                                const hours = overlap / 60;
                                                                const cost = hours * Number(rule.price);
                                                                totalPrice += cost;
                                                                breakdown.push({
                                                                    label: rule.label || 'Khung giờ',
                                                                    hours,
                                                                    price: Number(rule.price),
                                                                    cost,
                                                                });
                                                            }
                                                        });

                                                        return (
                                                            <>
                                                                {breakdown.map((b, i) => (
                                                                    <div key={i} className={styles.pricePreviewRow}>
                                                                        <span>{b.label} ({b.hours}h × {b.price.toLocaleString('vi-VN')}đ)</span>
                                                                        <strong>{b.cost.toLocaleString('vi-VN')}đ</strong>
                                                                    </div>
                                                                ))}
                                                                <div className={styles.pricePreviewDivider} />
                                                                <div className={styles.pricePreviewTotal}>
                                                                    <span>Tổng ({totalHours}h)</span>
                                                                    <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
                                                                </div>
                                                                {bookingForm.paymentMethod === 'DIRECT' && (
                                                                    <div className={styles.pricePreviewDeposit}>
                                                                        <span>Cọc 10%</span>
                                                                        <strong>{Math.round(totalPrice * 0.1).toLocaleString('vi-VN')}đ</strong>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label">Thanh toán</label>
                                                <div className={styles.paymentOptions}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.payOption} ${bookingForm.paymentMethod === 'DIRECT' ? styles.paySelected : ''}`}
                                                        onClick={() => setBookingForm({ ...bookingForm, paymentMethod: 'DIRECT' })}
                                                    >
                                                        <span>💵</span>
                                                        <div>
                                                            <strong>Tại sân</strong>
                                                            <span className="caption">Cọc 10% online</span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.payOption} ${bookingForm.paymentMethod === 'ONLINE' ? styles.paySelected : ''}`}
                                                        onClick={() => setBookingForm({ ...bookingForm, paymentMethod: 'ONLINE' })}
                                                    >
                                                        <span>💳</span>
                                                        <div>
                                                            <strong>Online</strong>
                                                            <span className="caption">Thanh toán toàn bộ</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

                                            <button
                                                className="btn btn-primary"
                                                style={{ width: '100%' }}
                                                disabled={!bookingForm.bookingDate || !bookingForm.startTime || !bookingForm.endTime || submitting}
                                                onClick={handleBookingSubmit}
                                            >
                                                {submitting ? <span className="spinner" /> : 'Đặt sân →'}
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {bookingStep === 'review' && calculatedPrice && (
                                <>
                                    <h2 className="heading-sm">Xác nhận đặt sân</h2>

                                    <div className={styles.summaryBox}>
                                        <div className={styles.summaryRow}>
                                            <span>Sân</span>
                                            <strong>{selectedField?.name}</strong>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>Ngày</span>
                                            <strong>{bookingForm.bookingDate}</strong>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>Giờ</span>
                                            <strong>{bookingForm.startTime} - {bookingForm.endTime}</strong>
                                        </div>
                                        <div className={styles.summaryDivider} />
                                        <div className={styles.summaryRow}>
                                            <span>Tổng tiền</span>
                                            <strong>{Number(calculatedPrice.totalPrice).toLocaleString('vi-VN')}đ</strong>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>{bookingForm.paymentMethod === 'ONLINE' ? 'Thanh toán' : 'Tiền cọc (10%)'}</span>
                                            <strong className={styles.priceHighlight}>
                                                {Number(calculatedPrice.depositAmount).toLocaleString('vi-VN')}đ
                                            </strong>
                                        </div>
                                        <div className={styles.summaryRow}>
                                            <span>Giữ chỗ</span>
                                            <strong>{calculatedPrice.holdMinutes} phút</strong>
                                        </div>
                                    </div>

                                    {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', marginBottom: 8 }}
                                        disabled={submitting}
                                        onClick={handlePayment}
                                    >
                                        {submitting ? <span className="spinner" /> : '💳 Thanh toán ngay'}
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ width: '100%' }}
                                        onClick={() => setBookingStep('select')}
                                    >
                                        ← Quay lại
                                    </button>
                                </>
                            )}

                            {bookingStep === 'done' && (
                                <div className={styles.doneState}>
                                    <div className={styles.doneIcon}>✅</div>
                                    <h2 className="heading-sm">Đặt sân thành công!</h2>
                                    <p className="caption">Bạn sẽ nhận được thông báo xác nhận. Chúc bạn có trận đấu vui vẻ!</p>
                                    <button className="btn btn-primary" onClick={() => router.push('/bookings')}>
                                        Xem đặt sân của tôi
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
