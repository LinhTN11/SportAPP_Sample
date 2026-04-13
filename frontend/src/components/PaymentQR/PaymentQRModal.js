'use client';

import { useMemo, useState } from 'react';
import CountdownTimer from './CountdownTimer';
import styles from './PaymentQRModal.module.css';

export default function PaymentQRModal({ booking, onClose, onConfirm, paymentType = 'deposit' }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const amount = useMemo(() => {
        if (!booking) return 0;
        if (paymentType === 'full') return Number(booking.totalPrice || 0);
        if (booking.depositAmount != null) return Number(booking.depositAmount || 0);
        return Math.round(Number(booking.totalPrice || 0) * 0.1);
    }, [booking, paymentType]);

    if (!booking) return null;

    const handleConfirmClick = async () => {
        if (typeof onConfirm !== 'function') return;

        setSubmitting(true);
        setError('');

        try {
            await onConfirm(booking.id);
            setSuccess(true);
            setTimeout(() => {
                if (typeof onClose === 'function') onClose();
            }, 700);
        } catch (err) {
            setError(err?.response?.data?.message || 'Khong the xac nhan thanh toan.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => !submitting && onClose?.()}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="heading-sm">Thanh toan QR</h3>
                    <button className="modal-close" onClick={() => !submitting && onClose?.()}>x</button>
                </div>

                <div style={{ marginBottom: 8 }}>
                    <CountdownTimer
                        expiresAt={booking.holdExpiresAt}
                        onExpired={() => setError('Phien dat cho da het han. Vui long dat lai.')}
                    />
                </div>

                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span>San</span>
                        <strong>{booking.field?.venue?.name || '-'}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Khung gio</span>
                        <strong>{booking.startTime} - {booking.endTime}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{paymentType === 'full' ? 'Tong thanh toan' : 'Tien coc'}</span>
                        <strong>{amount.toLocaleString('vi-VN')}d</strong>
                    </div>
                </div>

                <div className={styles.qrWrap}>
                    <div className={styles.qrPlaceholder}>QR</div>
                    <p className={styles.qrHint}>Quet ma QR bang ung dung ngan hang roi bam xac nhan thanh toan.</p>
                </div>

                {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
                {success && <div className={`${styles.alert} ${styles.alertSuccess}`}>Thanh toan thanh cong.</div>}

                <div className={styles.actions}>
                    <button className="btn btn-ghost" onClick={() => onClose?.()} disabled={submitting}>Huy</button>
                    <button className="btn btn-primary" onClick={handleConfirmClick} disabled={submitting || success}>
                        {submitting ? 'Dang xu ly...' : 'Toi da thanh toan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
