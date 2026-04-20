'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { venuesAPI, bookingsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './dashboard.module.css';

const statusMap = {
    PENDING_DEPOSIT: { label: 'Chờ cọc',      badgeClass: 'badge-warning' },
    CONFIRMED:       { label: 'Đã xác nhận',  badgeClass: 'badge-success' },
    COMPLETED:       { label: 'Hoàn thành',   badgeClass: 'badge-neutral' },
    CANCELLED:       { label: 'Đã hủy',       badgeClass: 'badge-danger'  },
    EXPIRED:         { label: 'Hết hạn',      badgeClass: 'badge-neutral' },
};

const venueStatusMap = {
    PENDING:   { label: 'Chờ duyệt',     badgeClass: 'badge-warning' },
    APPROVED:  { label: 'Hoạt động',     badgeClass: 'badge-success' },
    REJECTED:  { label: 'Bị từ chối',    badgeClass: 'badge-danger'  },
    SUSPENDED: { label: 'Tạm ngưng',     badgeClass: 'badge-neutral' },
};

export default function OwnerDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isOwner, loading: authLoading } = useAuth();

    const [venues, setVenues] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Derived stats
    const [stats, setStats] = useState({
        totalVenues: 0,
        approvedVenues: 0,
        totalFields: 0,
        todayBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        netRevenue: 0,
        todayRevenue: 0,
        occupancyRate: 0,
    });

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isOwner)) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, isOwner, router]);

    useEffect(() => {
        if (isOwner) fetchAll();
    }, [isOwner]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const { data: vData } = await venuesAPI.getMyVenues();
            const venueList = vData.data.venues || [];
            setVenues(venueList);

            // Fetch bookings for all approved venues
            const approvedVenues = venueList.filter(v => v.status === 'APPROVED');
            let allBk = [];
            await Promise.all(
                approvedVenues.map(async (v) => {
                    try {
                        const { data: bData } = await bookingsAPI.getVenueBookings(v.id, {});
                        const bks = (bData.data.bookings || []).map(b => ({ ...b, venueName: v.name }));
                        allBk = [...allBk, ...bks];
                    } catch { /* ignore */ }
                })
            );

            // Sort by date desc
            allBk.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAllBookings(allBk);

            // Compute stats
            const today = new Date().toISOString().slice(0, 10);
            const todayBks = allBk.filter(b => b.bookingDate?.slice(0, 10) === today);
            const confirmedBks = allBk.filter(b => b.status === 'CONFIRMED');
            const completedBks = allBk.filter(b => b.status === 'COMPLETED');
            const pendingBks = allBk.filter(b => b.status === 'PENDING_DEPOSIT');
            const paidBks = allBk.filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status));
            const totalRevenue = paidBks.reduce((s, b) => s + (Number(b.totalPrice) || 0), 0);
            const netRevenue = paidBks.reduce((s, b) => {
                const price = Number(b.totalPrice) || 0;
                const platformFeeTotal = Number(b.commissionAmount) || 0;
                const ownerTaxes = (Number(b.ownerVat) || 0) + (Number(b.ownerPit) || 0);
                return s + (price - platformFeeTotal - ownerTaxes);
            }, 0);
            const todayRevenue = todayBks
                .filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status))
                .reduce((s, b) => {
                    const price = Number(b.totalPrice) || 0;
                    const platformFeeTotal = Number(b.commissionAmount) || 0;
                    const ownerTaxes = (Number(b.ownerVat) || 0) + (Number(b.ownerPit) || 0);
                    return s + (price - platformFeeTotal - ownerTaxes);
                }, 0);
            const totalFields = venueList.reduce((s, v) => s + (v.fields?.length || 0), 0);
            const occupancy = allBk.length > 0
                ? Math.round((confirmedBks.length + completedBks.length) / allBk.length * 100)
                : 0;

            setStats({
                totalVenues: venueList.length,
                approvedVenues: approvedVenues.length,
                totalFields,
                todayBookings: todayBks.length,
                pendingBookings: pendingBks.length,
                confirmedBookings: confirmedBks.length,
                completedBookings: completedBks.length,
                totalRevenue,
                netRevenue,
                todayRevenue,
                occupancyRate: occupancy,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fmtCurrency = (n) =>
        n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(1)}tr`
            : n >= 1_000
            ? `${(n / 1_000).toFixed(0)}k`
            : `${n}`;

    const fmtTime = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const fmtDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const recentBookings = allBookings.slice(0, 8);

    if (authLoading || loading) {
        return (
            <div className="page">
                <div className="container" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }} />
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>

            {/* ── Welcome Banner ── */}
            <div className={styles.welcomeBanner}>
                <div className={styles.welcomeInner}>
                    <div>
                        <div className={styles.welcomeGreet}>Xin chào trở lại 👋</div>
                        <h1 className={styles.welcomeName}>{user?.fullName}</h1>
                        <p className={styles.welcomeSub}>
                            Bạn đang quản lý <strong>{stats.approvedVenues}</strong> sân hoạt động
                            với <strong>{stats.totalFields}</strong> sân con
                        </p>
                    </div>
                    <div className={styles.welcomeActions}>
                        <Link href="/owner/venues" className={`${styles.actionBtn} ${styles.actionBtnSolid}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            Quản lý sân
                        </Link>
                        <Link href="/owner/bookings" className={styles.actionBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Xem lịch đặt
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.container}>

                {/* ── Stats Grid ── */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                        <div className={styles.statIcon}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statValue}>{stats.todayBookings}</div>
                            <div className={styles.statLabel}>Đơn hôm nay</div>
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                        <div className={styles.statIcon}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                            </svg>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statValue}>{fmtCurrency(stats.netRevenue)}đ</div>
                            <div className={styles.statLabel}>Thu nhập thực tế (Net)</div>
                            <div className={styles.statSub}>Đã trừ phí sàn & thuế</div>
                            {stats.todayRevenue > 0 && (
                                <div className={styles.statSub} style={{ color: '#10b981', fontWeight: 600 }}>+{fmtCurrency(stats.todayRevenue)}đ hôm nay</div>
                            )}
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                        <div className={styles.statIcon}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statValue}>{stats.occupancyRate}%</div>
                            <div className={styles.statLabel}>Tỷ lệ xác nhận</div>
                        </div>
                        <div className={styles.statProgress}>
                            <div className={styles.statProgressBar} style={{ width: `${stats.occupancyRate}%` }} />
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.statCardOrange}`}>
                        <div className={styles.statIcon}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            </svg>
                        </div>
                        <div className={styles.statBody}>
                            <div className={styles.statValue}>{stats.totalFields}</div>
                            <div className={styles.statLabel}>Tổng sân con</div>
                            <div className={styles.statSub}>{stats.approvedVenues} địa điểm hoạt động</div>
                        </div>
                    </div>
                </div>

                {/* ── Booking Status Summary ── */}
                <div className={styles.statusRow}>
                    {[
                        { key: 'pendingBookings', label: 'Chờ cọc', icon: '⏳', color: '#f59e0b' },
                        { key: 'confirmedBookings', label: 'Đã xác nhận', icon: '✅', color: '#10b981' },
                        { key: 'completedBookings', label: 'Hoàn thành', icon: '🏆', color: '#6366f1' },
                    ].map(item => (
                        <div key={item.key} className={styles.statusChip} style={{ '--chip-color': item.color }}>
                            <span className={styles.statusChipIcon}>{item.icon}</span>
                            <span className={styles.statusChipCount}>{stats[item.key]}</span>
                            <span className={styles.statusChipLabel}>{item.label}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.mainGrid}>

                    {/* ── Recent Bookings ── */}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <h2 className={styles.panelTitle}>Đơn đặt sân gần đây</h2>
                                <p className={styles.panelSub}>Cập nhật theo thời gian thực</p>
                            </div>
                            <Link href="/owner/bookings" className={styles.panelLink}>
                                Xem tất cả →
                            </Link>
                        </div>

                        {recentBookings.length === 0 ? (
                            <div className={styles.emptyPanel}>
                                <span>📭</span>
                                <p>Chưa có đơn đặt sân nào</p>
                            </div>
                        ) : (
                            <div className={styles.bookingList}>
                                {recentBookings.map(bk => {
                                    const st = statusMap[bk.status] || statusMap.EXPIRED;
                                    return (
                                        <div key={bk.id} className={styles.bookingRow}>
                                            <div className={styles.bookingAvatar}>
                                                {bk.customer?.fullName?.[0] || '?'}
                                            </div>
                                            <div className={styles.bookingInfo}>
                                                <div className={styles.bookingName}>
                                                    {bk.customer?.fullName || 'Khách hàng'}
                                                </div>
                                                <div className={styles.bookingMeta}>
                                                    <span className={styles.bookingVenue}>{bk.venueName}</span>
                                                    <span className={styles.bookingDot}>·</span>
                                                    <span>{fmtDate(bk.bookingDate)}</span>
                                                    <span className={styles.bookingDot}>·</span>
                                                    <span>{fmtTime(bk.startTime)} – {fmtTime(bk.endTime)}</span>
                                                </div>
                                            </div>
                                            <div className={styles.bookingRight}>
                                                <span className={`badge ${st.badgeClass}`}>{st.label}</span>
                                                <span className={styles.bookingPrice}>
                                                    {bk.totalPrice
                                                        ? `${bk.totalPrice.toLocaleString('vi-VN')}đ`
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Venue Status Panel ── */}
                    <div className={styles.sidePanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <h2 className={styles.panelTitle}>Danh sách sân</h2>
                                <p className={styles.panelSub}>{stats.totalVenues} địa điểm</p>
                            </div>
                            <Link href="/owner/venues" className={styles.panelLink}>
                                Quản lý →
                            </Link>
                        </div>

                        {venues.length === 0 ? (
                            <div className={styles.emptyPanel}>
                                <span>🏟️</span>
                                <p>Chưa có sân nào</p>
                                <Link href="/owner/venues" className={styles.addVenueBtn}>
                                    + Thêm sân mới
                                </Link>
                            </div>
                        ) : (
                            <div className={styles.venueList}>
                                {venues.map(v => {
                                    const vs = venueStatusMap[v.status] || venueStatusMap.PENDING;
                                    return (
                                        <div key={v.id} className={styles.venueItem}>
                                            <div className={styles.venueItemIcon}>🏟️</div>
                                            <div className={styles.venueItemInfo}>
                                                <div className={styles.venueItemName}>{v.name}</div>
                                                <div className={styles.venueItemSub}>
                                                    {v.district}, {v.city} · {v.fields?.length || 0} sân con
                                                </div>
                                            </div>
                                            <span className={`badge ${vs.badgeClass}`}>
                                                {vs.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className={styles.quickActions}>
                            <div className={styles.quickActionsTitle}>Thao tác nhanh</div>
                            <div className={styles.quickActionsList}>
                                <Link href="/owner/venues" className={styles.quickAction}>
                                    <span className={styles.quickActionIcon}>➕</span>
                                    <span>Thêm sân mới</span>
                                </Link>
                                <Link href="/owner/bookings" className={styles.quickAction}>
                                    <span className={styles.quickActionIcon}>📋</span>
                                    <span>Xem lịch đặt</span>
                                </Link>
                                <Link href="/notifications" className={styles.quickAction}>
                                    <span className={styles.quickActionIcon}>🔔</span>
                                    <span>Thông báo</span>
                                </Link>
                                <Link href="/owner/taxes" className={styles.quickAction}>
                                    <span className={styles.quickActionIcon}>📑</span>
                                    <span>Thuế & Chứng từ</span>
                                </Link>
                                <Link href="/profile" className={styles.quickAction}>
                                    <span className={styles.quickActionIcon}>👤</span>
                                    <span>Hồ sơ cá nhân</span>
                                </Link>
                                <Link href="/support" className={`${styles.quickAction} ${styles.quickActionSupport}`}>
                                    <span className={styles.quickActionIcon}>🎧</span>
                                    <span>Liên hệ hỗ trợ</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
