'use client';

import { useState, useEffect, useRef } from 'react';
import {
    X, CheckCircle, Clock, QrCode, Shield,
    CalendarDays, MapPin, CreditCard, Banknote, ArrowRight, Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import styles from './PaymentQRModal.module.css';

/**
 * PaymentQRModal – Modern premium QR payment modal
 *
 * Props:
 *   booking      — booking object
 *   onClose      — close callback
 *   onConfirm    — async (bookingId) => void
 *   paymentType  — 'deposit' (10%) | 'full' (100%)
 */
export default function PaymentQRModal({ booking, onClose, onConfirm, paymentType = 'deposit' }) {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [done, setDone] = useState(false);
    const [step, setStep] = useState(1);
    const [mounted, setMounted] = useState(false);
    const modalRef = useRef(null);

    const isFullPayment = paymentType === 'full';
    const payAmount = isFullPayment
        ? Number(booking.totalPrice)
        : Number(booking.depositAmount);
    const payAmountFormatted = payAmount.toLocaleString('vi-VN');
    const totalAmount = Number(booking.totalPrice).toLocaleString('vi-VN');

    // Entrance animation
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    // Generate QR on step 2
    useEffect(() => {
        if (step !== 2) return;
        const qrContent = [
            `SPORTBOOK PAYMENT`,
            `Booking: ${booking.id.slice(0, 8).toUpperCase()}`,
            `Sân: ${booking.field?.venue?.name}`,
            `Loại: ${isFullPayment ? 'Thanh toán 100%' : 'Đặt cọc 10%'}`,
            `Số tiền: ${payAmountFormatted}đ`,
        ].join('\n');

        QRCode.toDataURL(qrContent, {
            width: 260,
            margin: 2,
            color: { dark: '#1e293b', light: '#FFFFFF' },
        }).then(setQrDataUrl);
    }, [booking.id, step, paymentType]);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm(booking.id);
            setDone(true);
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            alert(err?.response?.data?.message || 'Xác nhận thất bại');
        } finally {
            setConfirming(false);
        }
    };

    const bookingDate = booking.bookingDate
        ? new Date(booking.bookingDate).toLocaleDateString('vi-VN', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
        })
        : '—';

    return (
        <div className={`${styles.overlay} ${mounted ? styles.overlayVisible : ''}`} onClick={onClose}>
            <div
                ref={modalRef}
                className={`${styles.modal} ${mounted ? styles.modalVisible : ''}`}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Decorative gradient orbs ── */}
                <div className={styles.orbTop} />
                <div className={styles.orbBottom} />

                {/* ── Header ── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={`${styles.headerIcon} ${isFullPayment ? styles.headerIconFull : ''}`}>
                            {isFullPayment ? <CreditCard size={18} /> : <Banknote size={18} />}
                        </div>
                        <div>
                            <span className={styles.headerTitle}>
                                {isFullPayment ? 'Thanh toán toàn bộ' : 'Thanh toán đặt cọc'}
                            </span>
                            <span className={styles.headerSub}>
                                #{booking.id.slice(0, 8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* ── Step Indicator ── */}
                {!done && (
                    <div className={styles.stepBar}>
                        <div className={`${styles.stepItem} ${step >= 1 ? styles.stepActive : ''}`}>
                            <div className={styles.stepDot}>1</div>
                            <span>Xác nhận</span>
                        </div>
                        <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineActive : ''}`} />
                        <div className={`${styles.stepItem} ${step >= 2 ? styles.stepActive : ''}`}>
                            <div className={styles.stepDot}>2</div>
                            <span>Thanh toán</span>
                        </div>
                    </div>
                )}

                {/* ── Content ── */}
                <div className={styles.body}>
                    {done ? (
                        /* ══ Success State ══ */
                        <div className={styles.successState}>
                            <div className={styles.successRing}>
                                <CheckCircle size={48} color="#10B981" strokeWidth={1.8} />
                            </div>
                            <p className={styles.successText}>Thanh toán thành công!</p>
                            <p className={styles.successSub}>Booking đã được xác nhận. Chúc bạn thi đấu vui vẻ! 🎉</p>
                            <div className={styles.successAmount}>{payAmountFormatted}đ</div>
                        </div>

                    ) : step === 1 ? (
                        /* ══ Step 1: Booking Info ══ */
                        <div className={`${styles.stepContent} ${styles.fadeIn}`}>
                            {/* Info cards */}
                            <div className={styles.infoCards}>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoCardIcon}>
                                        <MapPin size={16} />
                                    </div>
                                    <div className={styles.infoCardContent}>
                                        <span className={styles.infoCardLabel}>Địa điểm</span>
                                        <span className={styles.infoCardValue}>{booking.field?.venue?.name}</span>
                                        <span className={styles.infoCardExtra}>{booking.field?.name}</span>
                                    </div>
                                </div>
                                <div className={styles.infoCard}>
                                    <div className={styles.infoCardIcon}>
                                        <CalendarDays size={16} />
                                    </div>
                                    <div className={styles.infoCardContent}>
                                        <span className={styles.infoCardLabel}>Lịch đặt</span>
                                        <span className={styles.infoCardValue}>{bookingDate}</span>
                                        <span className={styles.infoCardExtra}>{booking.startTime} — {booking.endTime}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price breakdown */}
                            <div className={styles.priceCard}>
                                <div className={styles.priceRow}>
                                    <span>Tổng tiền sân</span>
                                    <span>{totalAmount}đ</span>
                                </div>
                                <div className={styles.priceRow}>
                                    <span>Ưu đãi</span>
                                    <span className={styles.discount}>-0đ</span>
                                </div>
                                <div className={styles.priceDivider} />
                                <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                                    <span>{isFullPayment ? 'Thanh toán ngay' : 'Tiền cọc (10%)'}</span>
                                    <span className={isFullPayment ? styles.priceGreen : styles.priceOrange}>
                                        {payAmountFormatted}đ
                                    </span>
                                </div>
                            </div>

                            {/* Payment method tag */}
                            <div className={`${styles.methodTag} ${isFullPayment ? styles.methodFull : styles.methodDeposit}`}>
                                <div className={styles.methodIcon}>
                                    {isFullPayment ? <CreditCard size={16} /> : <Banknote size={16} />}
                                </div>
                                <div className={styles.methodText}>
                                    <strong>{isFullPayment ? 'Online — Thanh toán 100%' : 'Đặt cọc 10%'}</strong>
                                    <span>{isFullPayment ? 'Trả toàn bộ qua QR Code' : 'Thanh toán phần còn lại tại sân'}</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className={styles.actions}>
                                <button className={`${styles.btnPrimary} ${isFullPayment ? styles.btnGreen : ''}`} onClick={() => setStep(2)}>
                                    <QrCode size={18} />
                                    Tiếp tục thanh toán
                                    <ArrowRight size={16} />
                                </button>
                                <button className={styles.btnGhost} onClick={onClose}>Đóng</button>
                            </div>
                        </div>

                    ) : (
                        /* ══ Step 2: QR Code ══ */
                        <div className={`${styles.stepContent} ${styles.fadeIn}`}>
                            {/* QR Card */}
                            <div className={styles.qrCard}>
                                <div className={styles.qrCardInner}>
                                    {/* Corner markers */}
                                    <div className={`${styles.qrCorner} ${styles.qrCornerTL}`} />
                                    <div className={`${styles.qrCorner} ${styles.qrCornerTR}`} />
                                    <div className={`${styles.qrCorner} ${styles.qrCornerBL}`} />
                                    <div className={`${styles.qrCorner} ${styles.qrCornerBR}`} />

                                    {qrDataUrl ? (
                                        <img src={qrDataUrl} alt="QR thanh toán" className={styles.qrImage} />
                                    ) : (
                                        <div className={styles.qrSkeleton}>
                                            <div className={styles.qrShimmer} />
                                        </div>
                                    )}
                                </div>

                                {/* Amount pill */}
                                <div className={`${styles.amountPill} ${isFullPayment ? styles.amountPillGreen : ''}`}>
                                    <Sparkles size={14} />
                                    <span>{payAmountFormatted}đ</span>
                                    {isFullPayment && <span className={styles.amountBadge}>100%</span>}
                                </div>

                                <p className={styles.qrHint}>Mở app ngân hàng và quét mã QR để thanh toán</p>
                            </div>

                            {/* Security note */}
                            <div className={styles.securityNote}>
                                <Shield size={14} />
                                <span>Giao dịch được bảo mật bởi SportBook</span>
                            </div>

                            {/* Timer warning */}
                            <div className={styles.timerHint}>
                                <div className={styles.timerPulse} />
                                <Clock size={14} />
                                <span>Đặt chỗ sẽ hết hạn nếu không thanh toán đúng hạn</span>
                            </div>

                            {/* Actions */}
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.btnPrimary} ${isFullPayment ? styles.btnGreen : ''}`}
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                >
                                    {confirming ? (
                                        <>
                                            <span className={styles.spinner} />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            Tôi đã thanh toán
                                        </>
                                    )}
                                </button>
                                <button className={styles.btnGhost} onClick={() => setStep(1)}>
                                    ← Quay lại
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
