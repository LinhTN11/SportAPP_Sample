'use client';

import { useState } from 'react';
import { ShieldCheck, CheckCircle2, Users, Clock } from 'lucide-react';
import styles from '@/app/admin/dashboard/dashboard.module.css';
import Pagination from '@/components/ui/Pagination';

/* ─── Constants ─────────────────────────────── */
const ORDERS_PER_PAGE = 10;
const SIDE_PER_PAGE   = 5;

/* ─── Helpers ───────────────────────────────── */
const formatShortDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

/* ─── Status Badge ──────────────────────────── */
const STATUS_CONFIG = {
    PENDING:         { label: 'Đang chờ',  color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
    APPROVED:        { label: 'Đã duyệt',  color: '#10b981', bg: '#f0fdf4', border: '#dcfce7' },
    CONFIRMED:       { label: 'Xác nhận',  color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' },
    COMPLETED:       { label: 'Hoàn tất',  color: '#6366f1', bg: '#f5f3ff', border: '#e0e7ff' },
    CANCELLED:       { label: 'Đã hủy',    color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
    PENDING_DEPOSIT: { label: 'Chờ cọc',   color: '#64748b', bg: '#f8fafc', border: '#f1f5f9' },
};

const StatusBadge = ({ status }) => {
    const s = STATUS_CONFIG[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#f1f5f9' };
    return (
        <span className={styles.statusBadge} style={{ backgroundColor: s.bg, color: s.color, border: `1.5px solid ${s.border}` }}>
            {s.label}
        </span>
    );
};

/* ─── Order Row ─────────────────────────────── */
const OrderRow = ({ bk }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className={styles.orderRow}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Avatar */}
            <div className={styles.rowAvatar}>
                {bk.customer?.avatarUrl
                    ? <img src={bk.customer.avatarUrl} alt={bk.customer.fullName} />
                    : <span>{bk.customer?.fullName?.[0] || '?'}</span>
                }
            </div>

            {/* Name + Venue */}
            <div className={styles.rowMain}>
                <div className={styles.rowName}>{bk.customer?.fullName || '—'}</div>
                <div className={styles.rowVenue}>{bk.field?.venue?.name || '—'}</div>
            </div>

            {/* Status */}
            <StatusBadge status={bk.status} />

            {/* Hover Detail Pill */}
            <div className={`${styles.hoverDetail} ${hovered ? styles.hoverDetailVisible : ''}`}>
                <span>{formatShortDate(bk.createdAt)}</span>
                <span className={styles.hoverDot} />
                <span>{bk.field?.name}</span>
                <span className={styles.hoverDot} />
                <span className={styles.hoverPrice}>{Number(bk.totalPrice).toLocaleString('vi-VN')}đ</span>
            </div>
        </div>
    );
};

/* ─── Venue Item ────────────────────────────── */
const VenueItem = ({ venue }) => (
    <div className={styles.sideItem}>
        <div className={styles.sideItemIcon} style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <ShieldCheck size={16} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.sideItemTitle}>{venue.name}</div>
            <div className={styles.sideItemSub}>Chủ: {venue.owner?.fullName || '—'}</div>
        </div>
        <span className={styles.pendingBadge}>Chờ duyệt</span>
    </div>
);

/* ─── User Item ─────────────────────────────── */
const ROLE_STYLE = {
    ADMIN:    { label: 'Admin',    bg: '#fef3c7', color: '#d97706' },
    OWNER:    { label: 'Chủ sân',  bg: '#eef2ff', color: '#4f46e5' },
    CUSTOMER: { label: 'Khách',    bg: '#f0fdf4', color: '#10b981' },
};

const UserItem = ({ user }) => {
    const role = ROLE_STYLE[user.role] || { label: user.role, bg: '#f8fafc', color: '#64748b' };
    return (
        <div className={styles.sideItem}>
            <div className={styles.rowAvatar} style={{ width: 36, height: 36, borderRadius: '10px', fontSize: '13px' }}>
                {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.fullName} />
                    : <span>{user.fullName?.[0] || '?'}</span>
                }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.sideItemTitle}>{user.fullName}</div>
                <div className={styles.sideItemSub}>{user.email}</div>
            </div>
            <span className={styles.statusBadge} style={{ backgroundColor: role.bg, color: role.color, fontSize: '9px' }}>
                {role.label}
            </span>
        </div>
    );
};

/* ─── Main Component ────────────────────────── */
export default function RecentActivity({ activity }) {
    const [orderPage, setOrderPage]   = useState(1);
    const [venuePage, setVenuePage]   = useState(1);
    const [userPage,  setUserPage]    = useState(1);

    if (!activity) return null;

    const { recentBookings = [], recentVenues = [], recentUsers = [] } = activity;

    const pagedOrders = recentBookings.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE);
    const pagedVenues = recentVenues.slice((venuePage - 1) * SIDE_PER_PAGE, venuePage * SIDE_PER_PAGE);
    const pagedUsers  = recentUsers.slice((userPage - 1) * SIDE_PER_PAGE, userPage * SIDE_PER_PAGE);

    return (
        <div className={styles.activityGrid}>

            {/* ── Left: Recent Orders ─────────────── */}
            <div className={`${styles.panel} ${styles.ordersPanel}`}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Đơn hàng gần đây</h3>
                    <span className={styles.countBadge}>{recentBookings.length}</span>
                </div>

                <div className={styles.ordersList}>
                    {pagedOrders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <CheckCircle2 size={32} color="#cbd5e1" />
                            <p>Chưa có đơn hàng nào</p>
                        </div>
                    ) : (
                        pagedOrders.map(bk => <OrderRow key={bk.id} bk={bk} />)
                    )}
                </div>

                {recentBookings.length > ORDERS_PER_PAGE && (
                    <div className={styles.panelFooter}>
                        <Pagination
                            totalItems={recentBookings.length}
                            itemsPerPage={ORDERS_PER_PAGE}
                            currentPage={orderPage}
                            onPageChange={setOrderPage}
                        />
                    </div>
                )}
            </div>

            {/* ── Right: Venues + Users ───────────── */}
            <div className={styles.sideColumn}>

                {/* Pending Venues */}
                <div className={`${styles.panel} ${styles.sidePanel}`}>
                    <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle}>Phê duyệt sân</h3>
                        {recentVenues.length > 0 && (
                            <span className={styles.alertBadge}>{recentVenues.length}</span>
                        )}
                    </div>

                    <div className={styles.sideList}>
                        {pagedVenues.length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '20px' }}>
                                <ShieldCheck size={24} color="#cbd5e1" />
                                <p style={{ fontSize: '12px' }}>Không có sân chờ duyệt</p>
                            </div>
                        ) : (
                            pagedVenues.map(v => <VenueItem key={v.id} venue={v} />)
                        )}
                    </div>

                    {recentVenues.length > SIDE_PER_PAGE && (
                        <div className={styles.panelFooter}>
                            <Pagination
                                totalItems={recentVenues.length}
                                itemsPerPage={SIDE_PER_PAGE}
                                currentPage={venuePage}
                                onPageChange={setVenuePage}
                                maxPages={3}
                            />
                        </div>
                    )}
                </div>

                {/* New Users */}
                <div className={`${styles.panel} ${styles.sidePanel}`}>
                    <div className={styles.panelHeader}>
                        <h3 className={styles.panelTitle}>Thành viên mới</h3>
                        {recentUsers.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                                <Users size={14} /> {recentUsers.length}
                            </div>
                        )}
                    </div>

                    <div className={styles.sideList}>
                        {pagedUsers.length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '20px' }}>
                                <Users size={24} color="#cbd5e1" />
                                <p style={{ fontSize: '12px' }}>Chưa có thành viên mới</p>
                            </div>
                        ) : (
                            pagedUsers.map(u => <UserItem key={u.id} user={u} />)
                        )}
                    </div>

                    {recentUsers.length > SIDE_PER_PAGE && (
                        <div className={styles.panelFooter}>
                            <Pagination
                                totalItems={recentUsers.length}
                                itemsPerPage={SIDE_PER_PAGE}
                                currentPage={userPage}
                                onPageChange={setUserPage}
                                maxPages={3}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
