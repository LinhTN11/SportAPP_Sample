'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './profile.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, updateUser, loading: authLoading } = useAuth();
    const [form, setForm] = useState({
        fullName: '', phone: '', avatarUrl: '',
    });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (user) {
            setForm({
                fullName: user.fullName || '',
                phone: user.phone || '',
                avatarUrl: user.avatarUrl || '',
            });
        }
    }, [user, isAuthenticated, authLoading]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const { data } = await usersAPI.updateProfile(form);
            updateUser(data.data.user);
            setEditing(false);
            setMessage('✅ Cập nhật thành công!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Cập nhật thất bại'));
        } finally { setSaving(false); }
    };

    if (!user) return null;

    const roleLabels = {
        ADMIN: { label: 'Quản trị viên', icon: '👑', color: '#FF9F0A' },
        OWNER: { label: 'Chủ sân', icon: '🏠', color: '#30D158' },
        CUSTOMER: { label: 'Khách hàng', icon: '👤', color: '#0071E3' },
    };
    const role = roleLabels[user.role] || roleLabels.CUSTOMER;

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.layout}>
                    {/* Profile Card */}
                    <div className={styles.profileCard}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarLarge}>
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.fullName} />
                                ) : (
                                    user.fullName?.charAt(0)?.toUpperCase()
                                )}
                            </div>
                            <h1 className={styles.userName}>{user.fullName}</h1>
                            <div className={styles.roleBadge} style={{ background: role.color + '20', color: role.color }}>
                                {role.icon} {role.label}
                            </div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Email</span>
                                <span className={styles.infoValue}>📧 {user.email}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Số điện thoại</span>
                                <span className={styles.infoValue}>📱 {user.phone || 'Chưa có'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Xác thực</span>
                                <span className={styles.infoValue}>
                                    {user.isVerified ? '✅ Đã xác thực' : '⏳ Chưa xác thực'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Tham gia</span>
                                <span className={styles.infoValue}>
                                    📅 {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                        </div>

                        {!editing && (
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setEditing(true)}>
                                ✏️ Chỉnh sửa hồ sơ
                            </button>
                        )}
                    </div>

                    {/* Edit Form */}
                    {editing && (
                        <div className={styles.editCard}>
                            <h2 className="heading-sm">Chỉnh sửa hồ sơ</h2>

                            {message && (
                                <div className={styles.message} style={{ color: message.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSave}>
                                <div className="form-group">
                                    <label className="form-label">Họ và tên</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="0901234567"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Avatar URL</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="https://example.com/avatar.jpg"
                                        value={form.avatarUrl}
                                        onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                        {saving ? <span className="spinner" /> : '💾 Lưu'}
                                    </button>
                                    <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setMessage(''); }}>
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Quick Links */}
                    <div className={styles.quickLinks}>
                        <h3 className="heading-sm">Truy cập nhanh</h3>
                        <div className={styles.linkGrid}>
                            {user.role === 'CUSTOMER' && (
                                <>
                                    <button className={styles.linkCard} onClick={() => router.push('/bookings')}>
                                        <span>📅</span><strong>Đặt sân của tôi</strong>
                                    </button>
                                    <button className={styles.linkCard} onClick={() => router.push('/matchmaking')}>
                                        <span>🤝</span><strong>Ghép trận</strong>
                                    </button>
                                </>
                            )}
                            {user.role === 'OWNER' && (
                                <>
                                    <button className={styles.linkCard} onClick={() => router.push('/owner/venues')}>
                                        <span>🏟️</span><strong>Quản lý sân</strong>
                                    </button>
                                    <button className={styles.linkCard} onClick={() => router.push('/owner/bookings')}>
                                        <span>📋</span><strong>Lịch đặt sân</strong>
                                    </button>
                                </>
                            )}
                            {user.role === 'ADMIN' && (
                                <>
                                    <button className={styles.linkCard} onClick={() => router.push('/admin/venues')}>
                                        <span>✅</span><strong>Duyệt sân</strong>
                                    </button>
                                    <button className={styles.linkCard} onClick={() => router.push('/admin/users')}>
                                        <span>👥</span><strong>Quản lý users</strong>
                                    </button>
                                </>
                            )}
                            <button className={styles.linkCard} onClick={() => router.push('/chat')}>
                                <span>💬</span><strong>Tin nhắn</strong>
                            </button>
                            <button className={styles.linkCard} onClick={() => router.push('/notifications')}>
                                <span>🔔</span><strong>Thông báo</strong>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
