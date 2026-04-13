'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './notifications.module.css';

/* ─── Notification Types & Icons ─── */
const NotifIcon = ({ type }) => {
    const icons = {
        booking: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
        success: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
        warning: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        danger: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        ),
        review: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ),
        system: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2m0 16v2" />
            </svg>
        ),
        matchmaking: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
        ),
        promo: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
        ),
    };
    return icons[type] || icons.system;
};

/* ─── Mock Notifications ─── */
const MOCK_NOTIFICATIONS = [
    {
        id: 1,
        type: 'booking',
        iconType: 'success',
        category: 'booking',
        title: 'Đặt sân thành công',
        desc: 'Bạn đã đặt thành công <strong>Sân Cầu Lông Phú Nhuận – Sân 1</strong> vào Thứ 7, 12/04/2025, 7:00 – 9:00.',
        time: '10 phút trước',
        date: 'Hôm nay',
        unread: true,
        meta: [
            { label: '#BK2025041201', color: 'blue' },
            { label: '120.000đ', color: 'green' },
        ],
        actions: [
            { label: 'Xem chi tiết', type: 'primary', href: '/bookings' },
            { label: 'Hủy đặt', type: 'danger' },
        ],
    },
    {
        id: 2,
        type: 'booking',
        iconType: 'warning',
        category: 'booking',
        title: 'Nhắc nhở lịch sắp tới',
        desc: 'Bạn có lịch chơi <strong>Tennis tại Sân Q7 Elite</strong> vào ngày mai lúc 6:00 sáng. Nhớ chuẩn bị sớm nhé!',
        time: '1 giờ trước',
        date: 'Hôm nay',
        unread: true,
        meta: [
            { label: 'Thứ 5, 07/04', color: 'yellow' },
            { label: '06:00 – 08:00', color: 'orange' },
        ],
        actions: [
            { label: 'Xem lịch', type: 'primary', href: '/bookings' },
        ],
    },
    {
        id: 3,
        type: 'review',
        iconType: 'review',
        category: 'review',
        title: 'Đánh giá sân của bạn được phản hồi',
        desc: '<strong>Sân Badminton Tân Bình</strong> đã phản hồi đánh giá của bạn: "Cảm ơn bạn đã góp ý! Chúng tôi sẽ cải thiện."',
        time: '3 giờ trước',
        date: 'Hôm nay',
        unread: false,
        meta: [
            { label: '⭐ 4.0 / 5', color: 'orange' },
        ],
        actions: [
            { label: 'Xem đánh giá', type: 'secondary', href: '/venues' },
        ],
    },
    {
        id: 4,
        type: 'matchmaking',
        iconType: 'matchmaking',
        category: 'system',
        title: 'Tìm được đồng đội mới!',
        desc: '<strong>Nguyễn Minh Khoa</strong> đã chấp nhận lời mời ghép đội của bạn cho môn Cầu lông. Hãy liên hệ để lên kế hoạch!',
        time: '5 giờ trước',
        date: 'Hôm nay',
        unread: false,
        meta: [
            { label: 'Cầu lông', color: 'blue' },
            { label: 'Level B', color: 'green' },
        ],
        actions: [
            { label: 'Nhắn tin', type: 'primary', href: '/chat' },
            { label: 'Xem hồ sơ', type: 'secondary' },
        ],
    },
    {
        id: 5,
        type: 'booking',
        iconType: 'danger',
        category: 'booking',
        title: 'Đặt sân bị hủy',
        desc: 'Đáng tiếc, <strong>Sân Bóng Đá Mini Q12</strong> đã hủy lịch đặt của bạn vào ngày 05/04 do lý do kỹ thuật. Tiền hoàn trong 3-5 ngày.',
        time: 'Hôm qua, 14:30',
        date: 'Hôm qua',
        unread: false,
        meta: [
            { label: 'Hoàn tiền', color: 'green' },
            { label: '200.000đ', color: 'blue' },
        ],
        actions: [
            { label: 'Liên hệ hỗ trợ', type: 'secondary' },
        ],
    },
    {
        id: 6,
        type: 'review',
        iconType: 'review',
        category: 'review',
        title: 'Nhắc đánh giá sân',
        desc: 'Bạn vừa hoàn thành buổi chơi tại <strong>Sân Volleyball Bình Thạnh</strong>. Hãy chia sẻ trải nghiệm để giúp cộng đồng nhé!',
        time: 'Hôm qua, 10:00',
        date: 'Hôm qua',
        unread: false,
        meta: [
            { label: 'Chưa đánh giá', color: 'yellow' },
        ],
        actions: [
            { label: 'Đánh giá ngay', type: 'primary', href: '/venues' },
            { label: 'Để sau', type: 'secondary' },
        ],
    },
    {
        id: 7,
        type: 'promo',
        iconType: 'promo',
        category: 'system',
        title: 'Ưu đãi đặc biệt dành cho bạn',
        desc: 'Chỉ trong hôm nay! Giảm <strong>30%</strong> cho tất cả sân Cầu lông tại khu vực Quận 3 – Phú Nhuận khi đặt qua app.',
        time: 'Hôm qua, 08:00',
        date: 'Hôm qua',
        unread: false,
        meta: [
            { label: 'Giảm 30%', color: 'red' },
            { label: 'Hết hôm nay', color: 'yellow' },
        ],
        actions: [
            { label: 'Đặt sân ngay', type: 'primary', href: '/venues' },
        ],
    },
    {
        id: 8,
        type: 'system',
        iconType: 'system',
        category: 'system',
        title: 'Cập nhật ứng dụng phiên bản 2.4.0',
        desc: 'SportApp vừa ra mắt phiên bản mới với nhiều tính năng: tìm đồng đội nâng cao, lịch sử chi tiết hơn, và giao diện mới.',
        time: '3 ngày trước',
        date: '3 ngày trước',
        unread: false,
        meta: [
            { label: 'v2.4.0', color: 'blue' },
        ],
        actions: [],
    },
];

const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'booking', label: 'Đặt sân' },
    { key: 'review', label: 'Đánh giá' },
    { key: 'system', label: 'Hệ thống' },
];

const CloseIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const CheckAllIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 7 17l-5-5" /><path d="m22 10-8.5 8.5L12 17" />
    </svg>
);
const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2m0 16v2" />
    </svg>
);
const BellIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

/* ─── Notification Card Component ─── */
function NotifCard({ notif, onDismiss, onMarkRead }) {
    return (
        <div className={`${styles.notifCard} ${notif.unread ? styles.unread : ''}`}>
            <div className={styles.notifInner}>
                <div className={`${styles.notifIconWrap} ${styles[notif.iconType]}`}>
                    <NotifIcon type={notif.iconType} />
                </div>

                <div className={styles.notifContent}>
                    <div className={styles.notifTopRow}>
                        <span className={styles.notifTitle}>{notif.title}</span>
                        <div className={styles.notifTimeRow}>
                            <span className={styles.notifTime}>{notif.time}</span>
                            {notif.unread && <span className={styles.unreadDot} />}
                        </div>
                    </div>

                    <p
                        className={styles.notifDesc}
                        dangerouslySetInnerHTML={{ __html: notif.desc }}
                    />

                    {notif.meta && notif.meta.length > 0 && (
                        <div className={styles.notifMeta}>
                            {notif.meta.map((m, i) => (
                                <span key={i} className={`${styles.metaTag} ${styles[m.color]}`}>
                                    {m.label}
                                </span>
                            ))}
                        </div>
                    )}

                    {notif.actions && notif.actions.length > 0 && (
                        <div className={styles.notifActions}>
                            {notif.actions.map((action, i) => (
                                action.href ? (
                                    <Link
                                        key={i}
                                        href={action.href}
                                        className={`${styles.actionBtn} ${styles[action.type]}`}
                                    >
                                        {action.label}
                                    </Link>
                                ) : (
                                    <button
                                        key={i}
                                        className={`${styles.actionBtn} ${styles[action.type]}`}
                                    >
                                        {action.label}
                                    </button>
                                )
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className={styles.dismissBtn}
                    onClick={() => onDismiss(notif.id)}
                    title="Xóa thông báo"
                >
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        import('@/lib/api').then(({ notificationsAPI }) => {
            notificationsAPI.list()
                .then(res => {
                    const data = res.data.data.notifications || [];
                    const formatted = data.map(n => {
                        let iconType = 'system';
                        let category = 'system';
                        let href = null;
                        
                        // Map type to UI categories
                        if (n.type?.includes('BOOKING')) {
                            category = 'booking';
                            iconType = n.type.includes('CONFIRMED') ? 'success' : 'danger';
                            href = '/bookings';
                        } else if (n.type === 'NEW_MESSAGE') {
                            category = 'system';
                            iconType = 'matchmaking';
                            href = '/chat';
                        } else if (n.type?.includes('MATCH')) {
                            category = 'system';
                            iconType = 'matchmaking';
                            href = '/matchmaking';
                        }

                        // Parse Date smartly
                        const d = new Date(n.createdAt);
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        
                        let dateStr = d.toLocaleDateString();
                        if (d.toDateString() === today.toDateString()) dateStr = 'Hôm nay';
                        else if (d.toDateString() === yesterday.toDateString()) dateStr = 'Hôm qua';

                        return {
                            id: n.id,
                            type: n.type,
                            iconType,
                            category,
                            title: n.title,
                            desc: n.body,
                            time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                            date: dateStr,
                            unread: !n.isRead,
                            meta: [],
                            actions: href ? [{ label: 'Xem chi tiết', type: 'primary', href }] : []
                        };
                    });
                    setNotifications(formatted);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Lỗi khi tải thông báo:', err);
                    setLoading(false);
                });
        });
    }, []);

    const filtered = notifications.filter(n =>
        activeTab === 'all' ? true : n.category === activeTab
    );

    const unreadCount = notifications.filter(n => n.unread).length;

    const countByTab = (tab) =>
        tab === 'all'
            ? notifications.length
            : notifications.filter(n => n.category === tab).length;

    const handleMarkAllRead = () => {
        import('@/lib/api').then(({ notificationsAPI }) => {
            notificationsAPI.markAllRead().then(() => {
                setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            });
        });
    };

    const handleMarkRead = (id) => {
        import('@/lib/api').then(({ notificationsAPI }) => {
            notificationsAPI.markRead(id).then(() => {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
            });
        });
    };

    const handleDismiss = (id) => {
        // Here we just hide it locally, since the API doesn't have a DELETE endpoint yet.
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Group by date
    const grouped = filtered.reduce((acc, n) => {
        if (!acc[n.date]) acc[n.date] = [];
        acc[n.date].push(n);
        return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => {
        if (a === 'Hôm nay') return -1;
        if (b === 'Hôm nay') return 1;
        if (a === 'Hôm qua') return -1;
        if (b === 'Hôm qua') return 1;
        return new Date(b) - new Date(a);
    });

    return (
        <div className={styles.page}>
            {/* ─── Hero ─── */}
            <div className={styles.heroSection}>
                <div className={styles.container}>
                    <div className={styles.heroRow}>
                        <div className={styles.heroLeft}>
                            <div className={styles.heroIcon}>
                                <BellIcon />
                            </div>
                            <div>
                                <h1 className={styles.heroTitle}>
                                    Thông báo
                                    {unreadCount > 0 && (
                                        <span style={{
                                            marginLeft: 10,
                                            fontSize: 14,
                                            fontWeight: 700,
                                            background: '#FF6E40',
                                            color: 'white',
                                            padding: '2px 10px',
                                            borderRadius: 999,
                                            verticalAlign: 'middle',
                                        }}>
                                            {unreadCount} mới
                                        </span>
                                    )}
                                </h1>
                                <p className={styles.heroSub}>Cập nhật hoạt động và tin tức mới nhất</p>
                            </div>
                        </div>
                        <div className={styles.heroActions}>
                            {unreadCount > 0 && (
                                <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                                    <CheckAllIcon />
                                    Đánh dấu đã đọc
                                </button>
                            )}
                            <button className={styles.settingsBtn} title="Cài đặt thông báo">
                                <SettingsIcon />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabsRow}>
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                <span className={styles.tabCount}>{countByTab(tab.key)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Main Content ─── */}
            <div className={styles.mainContent}>

                {/* Summary Stats */}
                <div className={styles.summaryBar}>
                    <div className={styles.summaryCard}>
                        <div className={`${styles.summaryNumber} ${styles.orange}`}>{unreadCount}</div>
                        <div className={styles.summaryLabel}>Chưa đọc</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={`${styles.summaryNumber} ${styles.blue}`}>{countByTab('booking')}</div>
                        <div className={styles.summaryLabel}>Đặt sân</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={`${styles.summaryNumber} ${styles.green}`}>{notifications.length}</div>
                        <div className={styles.summaryLabel}>Tổng cộng</div>
                    </div>
                </div>

                {/* Notification Groups */}
                {loading ? (
                    <div className={styles.emptyState}>
                        <div className="spinner" style={{marginBottom: 16}} />
                        <p className={styles.emptyDesc}>Đang tải thông báo...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrap}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                        </div>
                        <h3 className={styles.emptyTitle}>Không có thông báo</h3>
                        <p className={styles.emptyDesc}>Bạn đã xem hết tất cả thông báo trong mục này.</p>
                    </div>
                ) : (
                    sortedDates.map(date => (
                        <div key={date} className={styles.dateGroup}>
                            <div className={styles.dateLabel}>{date}</div>
                            {grouped[date].map(notif => (
                                <NotifCard
                                    key={notif.id}
                                    notif={notif}
                                    onDismiss={handleDismiss}
                                    onMarkRead={handleMarkRead}
                                />
                            ))}
                        </div>
                    ))
                )}

                {filtered.length > 0 && !loading && (
                    <div className={styles.loadMoreWrapper}>
                        <button className={styles.loadMoreBtn}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                            Xem thêm thông báo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
