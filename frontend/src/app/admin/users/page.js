'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import styles from './adminUsers.module.css';

export default function AdminUsersPage() {
    const router = useRouter();
    const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isAdmin)) { router.push('/login'); return; }
        if (isAdmin) loadUsers();
    }, [isAuthenticated, isAdmin, authLoading]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const { data } = await usersAPI.listUsers();
            setUsers(data.data.users);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const roleMap = {
        ADMIN: { label: 'Admin', class: 'badge-warning', icon: '👑' },
        OWNER: { label: 'Chủ sân', class: 'badge-success', icon: '🏠' },
        CUSTOMER: { label: 'Khách hàng', class: 'badge-primary', icon: '👤' },
    };

    const filteredUsers = users.filter(u => {
        if (filter && u.role !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        }
        return true;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        owners: users.filter(u => u.role === 'OWNER').length,
        customers: users.filter(u => u.role === 'CUSTOMER').length,
    };

    return (
        <div className={styles.page}>
            <div className="container">
                <h1 className="heading-lg">Quản lý người dùng</h1>

                {/* Stats */}
                <div className={styles.stats}>
                    <button className={`${styles.statCard} ${filter === '' ? styles.statActive : ''}`} onClick={() => setFilter('')}>
                        <strong>{stats.total}</strong><span>Tất cả</span>
                    </button>
                    <button className={`${styles.statCard} ${filter === 'ADMIN' ? styles.statActive : ''}`} onClick={() => setFilter('ADMIN')}>
                        <strong>{stats.admins}</strong><span>👑 Admin</span>
                    </button>
                    <button className={`${styles.statCard} ${filter === 'OWNER' ? styles.statActive : ''}`} onClick={() => setFilter('OWNER')}>
                        <strong>{stats.owners}</strong><span>🏠 Chủ sân</span>
                    </button>
                    <button className={`${styles.statCard} ${filter === 'CUSTOMER' ? styles.statActive : ''}`} onClick={() => setFilter('CUSTOMER')}>
                        <strong>{stats.customers}</strong><span>👤 Khách</span>
                    </button>
                </div>

                {/* Search */}
                <div className={styles.searchBar}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Tìm theo tên hoặc email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div>{[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonRow}><div className="skeleton" style={{ height: 16, width: '30%', marginBottom: 6 }} /><div className="skeleton" style={{ height: 14, width: '50%' }} /></div>)}</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Email</th>
                                    <th>SĐT</th>
                                    <th>Vai trò</th>
                                    <th>Xác thực</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className={styles.userCell}>
                                                <Avatar user={u} size="sm" />
                                                <strong>{u.fullName}</strong>
                                            </div>
                                        </td>
                                        <td className={styles.emailCell}>{u.email}</td>
                                        <td>{u.phone || '—'}</td>
                                        <td>
                                            <span className={`badge ${roleMap[u.role]?.class}`}>
                                                {roleMap[u.role]?.icon} {roleMap[u.role]?.label}
                                            </span>
                                        </td>
                                        <td>{u.isVerified ? '✅' : '⏳'}</td>
                                        <td className="caption">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredUsers.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">Không tìm thấy người dùng</div>
                    </div>
                )}
            </div>
        </div>
    );
}
