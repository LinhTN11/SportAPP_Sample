'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import styles from './PaymentQRModal.module.css';

/**
 * PaymentQRModal
 * Props:
 *   booking     — booking object (id, depositAmount, totalPrice, field)
 *   onClose     — đóng modal
 *   onConfirm   — callback sau khi user bấm xác nhận (gọi API confirm)
 */
export default function PaymentQRModal({ booking, onClose, onConfirm }) {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [done, setDone] = useState(false);

    const depositAmount = Number(booking.depositAmount).toLocaleString('vi-VN');
    const totalAmount = Number(booking.totalPrice).toLocaleString('vi-VN');

    // Tạo QR từ thông tin giả lập
    useEffect(() => {
        const qrContent = [
            `SPORTBOOK PAYMENT`,
            `Booking: ${booking.id.slice(0, 8).toUpperCase()}`,
            `Sân: ${booking.field?.venue?.name}`,
            `Tiền cọc: ${depositAmount}đ`,
        ].join('\n');

        QRCode.toDataURL(qrContent, {
            width: 220,
            margin: 2,
            color: { dark: '#1A1A1A', light: '#FFFFFF' },
        }).then(setQrDataUrl);
    }, [booking.id]);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm(booking.id);
            setDone(true);
            // Tự đóng sau 1.5s
            setTimeout(() => onClose(), 1500);
        } catch (err) {
            alert(err?.response?.data?.message || 'Xác nhận thất bại');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <span className={styles.headerTitle}>Thanh toán tiền cọc</span>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {done ? (
                    /* ── Thành công ── */
                    <div className={styles.successState}>
                        <CheckCircle size={56} color="#10B981" strokeWidth={1.5} />
                        <p className={styles.successText}>Thanh toán thành công!</p>
                        <p className={styles.successSub}>Booking đã được xác nhận</p>
                    </div>
                ) : (
                    <>
                        {/* Thông tin booking */}
                        <div className={styles.infoBox}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Sân</span>
                                <span className={styles.infoValue}>{booking.field?.venue?.name}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Sân con</span>
                                <span className={styles.infoValue}>{booking.field?.name}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Thời gian</span>
                                <span className={styles.infoValue}>{booking.startTime} – {booking.endTime}</span>
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Tổng tiền</span>
                                <span className={styles.infoValue}>{totalAmount}đ</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Tiền cọc (10%)</span>
                                <span className={styles.depositAmount}>{depositAmount}đ</span>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className={styles.qrWrapper}>
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="QR thanh toán" className={styles.qrImage} />
                            ) : (
                                <div className={styles.qrPlaceholder}>
                                    <div className={styles.qrSkeleton} />
                                </div>
                            )}
                            <p className={styles.qrHint}>Quét mã QR để thanh toán tiền cọc</p>
                        </div>

                        {/* Hold timer hint */}
                        <div className={styles.timerHint}>
                            <Clock size={14} color="#F59E0B" />
                            <span>Đặt chỗ sẽ hết hạn nếu không thanh toán đúng hạn</span>
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button className={styles.btnConfirm} onClick={handleConfirm} disabled={confirming}>
                                {confirming ? 'Đang xử lý...' : 'Tôi đã thanh toán'}
                            </button>
                            <button className={styles.btnClose} onClick={onClose}>
                                Đóng
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}