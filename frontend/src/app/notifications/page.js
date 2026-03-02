'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './notifications.module.css';

export default function NotificationsPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (isAuthenticated) loadNotifications();
    }, [isAuthenticated, authLoading]);

    const loadNotifications = async () => {
        try {
            const { data } = await notificationsAPI.list();
            setNotifications(data.data.notifications);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleMarkAllRead = async () => {
        await notificationsAPI.markAllRead();
        loadNotifications();
    };

    const iconMap = {
        BOOKING_CONFIRMED: '✅', BOOKING_CANCELLED: '❌', VENUE_APPROVED: '🎉',
        VENUE_REJECTED: '😢', MATCH_REQUEST: '🤝', MATCH_ACCEPTED: '🎯',
        MATCH_REJECTED: '😔', MATCH_AUTO: '🤖', MATCH_CANCELLED: '🚫',
        PAYMENT_SUCCESS: '💰', PAYMENT_FAILED: '⚠️', NEW_MESSAGE: '💬', NEW_REVIEW: '⭐',
    };

    return (
        <div className={styles.page}>
            <div className="container">
                <div className="flex-between" style={{ marginBottom: 24 }}>
                    <h1 className="heading-lg">Thông báo</h1>
                    {notifications.some(n => !n.isRead) && (
                        <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className={styles.list}>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 8 }} />)}</div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔔</div>
                        <div className="empty-state-title">Chưa có thông báo</div>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {notifications.map((notif) => (
                            <div key={notif.id} className={`${styles.notifItem} ${!notif.isRead ? styles.unread : ''}`} onClick={async () => { if (!notif.isRead) { await notificationsAPI.markRead(notif.id); loadNotifications(); } }}>
                                <div className={styles.notifIcon}>{iconMap[notif.type] || '📢'}</div>
                                <div className={styles.notifContent}>
                                    <strong>{notif.title}</strong>
                                    <p>{notif.body}</p>
                                    <span className="caption">{new Date(notif.createdAt).toLocaleString('vi-VN')}</span>
                                </div>
                                {!notif.isRead && <div className={styles.unreadDot} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
