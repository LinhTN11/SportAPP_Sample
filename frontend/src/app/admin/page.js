'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsAPI, usersAPI, venuesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './dashboard.module.css';

const defaultStats = {
    totalUsers: 0,
    owners: 0,
    customers: 0,
    pendingVenues: 0,
    unreadNotifications: 0,
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
    const [stats, setStats] = useState(defaultStats);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/login');
            return;
        }

        if (isAdmin) loadDashboard();
    }, [isAuthenticated, isAdmin, authLoading, router]);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const [allUsersRes, ownersRes, customersRes, pendingVenuesRes, notificationsRes] = await Promise.all([
                usersAPI.listUsers({ page: 1, limit: 1 }),
                usersAPI.listUsers({ role: 'OWNER', page: 1, limit: 1 }),
                usersAPI.listUsers({ role: 'CUSTOMER', page: 1, limit: 1 }),
                venuesAPI.getPending(),
                notificationsAPI.list({ unreadOnly: 'true', page: 1, limit: 1 }),
            ]);

            setStats({
                totalUsers: allUsersRes.data.data.pagination?.total || 0,
                owners: ownersRes.data.data.pagination?.total || 0,
                customers: customersRes.data.data.pagination?.total || 0,
                pendingVenues: pendingVenuesRes.data.data.venues?.length || 0,
                unreadNotifications: notificationsRes.data.data.unreadCount || 0,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const ownerRatio = stats.totalUsers > 0 ? Math.round((stats.owners / stats.totalUsers) * 100) : 0;

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className="heading-lg">Admin Dashboard</h1>
                        <p className="caption">Tổng quan nhanh các chỉ số vận hành của hệ thống</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={loadDashboard} disabled={loading}>
                        {loading ? 'Đang tải...' : 'Làm mới KPI'}
                    </button>
                </div>

                <div className={styles.kpiGrid}>
                    <Link href="/admin/users" className={styles.kpiCard}>
                        <span className={styles.kpiIcon}>👥</span>
                        <div className={styles.kpiValue}>{loading ? '...' : stats.totalUsers}</div>
                        <div className={styles.kpiLabel}>Tổng người dùng</div>
                    </Link>

                    <Link href="/admin/venues" className={styles.kpiCard}>
                        <span className={styles.kpiIcon}>⏳</span>
                        <div className={styles.kpiValue}>{loading ? '...' : stats.pendingVenues}</div>
                        <div className={styles.kpiLabel}>Sân chờ duyệt</div>
                    </Link>

                    <Link href="/admin/users" className={styles.kpiCard}>
                        <span className={styles.kpiIcon}>🏠</span>
                        <div className={styles.kpiValue}>{loading ? '...' : stats.owners}</div>
                        <div className={styles.kpiLabel}>Tài khoản chủ sân</div>
                    </Link>

                    <Link href="/notifications" className={styles.kpiCard}>
                        <span className={styles.kpiIcon}>🔔</span>
                        <div className={styles.kpiValue}>{loading ? '...' : stats.unreadNotifications}</div>
                        <div className={styles.kpiLabel}>Thông báo chưa đọc</div>
                    </Link>
                </div>

                <div className={styles.panelWrap}>
                    <div className={styles.panel}>
                        <h2 className="heading-sm">Phân bổ vai trò</h2>
                        <div className={styles.roleRow}>
                            <span className="badge badge-success">🏠 Chủ sân: {loading ? '...' : stats.owners}</span>
                            <span className="badge badge-primary">👤 Khách: {loading ? '...' : stats.customers}</span>
                            <span className="badge badge-warning">📊 Tỷ lệ chủ sân: {loading ? '...' : `${ownerRatio}%`}</span>
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <h2 className="heading-sm">Thao tác nhanh</h2>
                        <div className={styles.actionRow}>
                            <Link href="/admin/venues" className="btn btn-primary btn-sm">Duyệt sân</Link>
                            <Link href="/admin/users" className="btn btn-secondary btn-sm">Quản lý người dùng</Link>
                            <Link href="/notifications" className="btn btn-ghost btn-sm">Mở thông báo</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
