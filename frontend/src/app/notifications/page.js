'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './notifications.module.css';

export default function NotificationsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markAllLoading, setMarkAllLoading] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (isAuthenticated) loadNotifications();
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    };

    const loadNotifications = async (withLoading = true) => {
        try {
            if (withLoading) setLoading(true);
            const { data } = await notificationsAPI.list();
            setNotifications(data.data.notifications || []);
        } catch (err) { console.error(err); }
        finally { if (withLoading) setLoading(false); }
    };

    const handleMarkAllRead = async () => {
        if (!notifications.some((n) => !n.isRead)) {
            showToast('warning', 'Tất cả thông báo đã được đọc');
            return;
        }

        try {
            setMarkAllLoading(true);
            await notificationsAPI.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            showToast('success', 'Đã đánh dấu tất cả là đã đọc');
        } catch (err) {
            console.error(err);
            showToast('error', 'Không thể cập nhật thông báo');
        } finally {
            setMarkAllLoading(false);
        }
    };

    const handleMarkRead = async (notification) => {
        if (notification.isRead || markingId === notification.id) return;

        try {
            setMarkingId(notification.id);
            await notificationsAPI.markRead(notification.id);
            setNotifications((prev) => prev.map((n) => (
                n.id === notification.id ? { ...n, isRead: true } : n
            )));
            showToast('success', 'Đã đánh dấu thông báo là đã đọc');
        } catch (err) {
            console.error(err);
            showToast('error', 'Không thể cập nhật thông báo');
        } finally {
            setMarkingId(null);
        }
    };

    const notificationMeta = {
        BOOKING_CONFIRMED: { icon: '✅', label: 'Đặt sân', badge: 'badge-success' },
        BOOKING_CANCELLED: { icon: '❌', label: 'Đặt sân', badge: 'badge-danger' },
        VENUE_APPROVED: { icon: '🎉', label: 'Sân', badge: 'badge-primary' },
        VENUE_REJECTED: { icon: '😢', label: 'Sân', badge: 'badge-warning' },
        MATCH_REQUEST: { icon: '🤝', label: 'Ghép trận', badge: 'badge-primary' },
        MATCH_ACCEPTED: { icon: '🎯', label: 'Ghép trận', badge: 'badge-success' },
        MATCH_REJECTED: { icon: '😔', label: 'Ghép trận', badge: 'badge-neutral' },
        MATCH_AUTO: { icon: '🤖', label: 'Ghép trận', badge: 'badge-warning' },
        MATCH_CANCELLED: { icon: '🚫', label: 'Ghép trận', badge: 'badge-danger' },
        PAYMENT_SUCCESS: { icon: '💰', label: 'Thanh toán', badge: 'badge-success' },
        PAYMENT_FAILED: { icon: '⚠️', label: 'Thanh toán', badge: 'badge-danger' },
        NEW_MESSAGE: { icon: '💬', label: 'Tin nhắn', badge: 'badge-primary' },
        NEW_REVIEW: { icon: '⭐', label: 'Đánh giá', badge: 'badge-warning' },
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <h1 className="heading-lg">
                        Thông báo
                        <span className={`badge badge-primary ${styles.unreadBadge}`}>
                            {unreadCount} chưa đọc
                        </span>
                    </h1>
                    <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead} disabled={markAllLoading}>
                        {markAllLoading ? 'Đang cập nhật...' : 'Đánh dấu tất cả đã đọc'}
                    </button>
                </div>

                {loading ? (
                    <div className={styles.list}>{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12, marginBottom: 8 }} />)}</div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔔</div>
                        <div className="empty-state-title">Chưa có thông báo</div>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`${styles.notifItem} ${!notif.isRead ? styles.unread : ''} ${markingId === notif.id ? styles.notifItemBusy : ''}`}
                                onClick={() => handleMarkRead(notif)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleMarkRead(notif);
                                    }
                                }}
                            >
                                <div className={styles.notifIcon}>{notificationMeta[notif.type]?.icon || '📢'}</div>
                                <div className={styles.notifContent}>
                                    <strong>{notif.title}</strong>
                                    <p>{notif.body}</p>
                                    <div className={styles.metaRow}>
                                        <span className={`badge ${(notificationMeta[notif.type]?.badge || 'badge-neutral')} ${styles.typeBadge}`}>
                                            {notificationMeta[notif.type]?.label || 'Thông báo'}
                                        </span>
                                        <span className="caption">{new Date(notif.createdAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                </div>
                                {!notif.isRead && <div className={styles.unreadDot} />}
                            </div>
                        ))}
                    </div>
                )}

                {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
            </div>
        </div>
    );
}
