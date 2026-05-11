/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI, bookingsAPI, reviewsAPI, uploadAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
    Mail, Phone, Calendar, CheckCircle, XCircle,
    Edit2, Save, X, Camera,
    Building2, Users, Star, Trophy,
    MessageCircle, Bell, ClipboardList, CheckSquare,
    CalendarX, ArrowRight, Headphones
} from 'lucide-react';
import styles from './profile.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, updateUser, loading: authLoading } = useAuth();
    const [form, setForm] = useState({
        fullName: '', phone: '', avatarUrl: '',
    });
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [recentBookings, setRecentBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [stats, setStats] = useState({ totalBookings: 0, completedBookings: 0 });
    const [reviewCount, setReviewCount] = useState(0);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [coverUploading, setCoverUploading] = useState(false);

    const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) { router.push('/login'); return; }
        if (user) {
            setForm({
                fullName: user.fullName || '',
                phone: user.phone || '',
                avatarUrl: user.avatarUrl || '',
            });
            loadRecentBookings();
            loadReviews();
        }
    }, [user, isAuthenticated, authLoading]);

    const loadRecentBookings = async () => {
        try {
            setBookingsLoading(true);
            // Lấy tất cả để tính stats, dùng limit lớn
            const { data } = await bookingsAPI.getMyBookings({ limit: 100 });
            const all = data.data?.bookings || data.data || [];
            setRecentBookings(all.slice(0, 3)); // chỉ hiện 3 cái gần nhất
            setStats({
                totalBookings: all.length,
                completedBookings: all.filter(b => b.status === 'COMPLETED').length,
            });
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const { data } = await usersAPI.updateProfile(form);
            updateUser(data.data.user);
            setEditing(false);
            setMessage({ text: 'Cập nhật thành công!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Cập nhật thất bại', type: 'error' });
        } finally { setSaving(false); }
    };
    const loadReviews = async () => {
    try {
        setReviewsLoading(true);
        const { data } = await reviewsAPI.getMyReviews();
        
        // Backend trả về { success: true, data: { reviews: [...] } }
        const reviews = data.data.reviews || [];
        setReviewCount(reviews.length);
        
        console.log('User reviews:', reviews); // Debug
    } catch (err) {
        console.error('Failed to load reviews:', err);
        setReviewCount(0);
    } finally {
        setReviewsLoading(false);
    }
};

    if (!user) return null;

    const roleLabels = {
        ADMIN: { label: 'Quản trị viên', color: '#FF9F0A' },
        OWNER: { label: 'Chủ sân', color: '#30D158' },
        CUSTOMER: { label: 'Khách hàng', color: '#0066FF' },
    };
    const role = roleLabels[user.role] || roleLabels.CUSTOMER;

    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setCoverUploading(true);
            const { data: uploadData } = await uploadAPI.single(file);
            const coverUrl = `${SERVER_URL}${uploadData.data.url}`;
            await usersAPI.updateProfile({ coverImageUrl: coverUrl });
            updateUser({ ...user, coverImageUrl: coverUrl });
        } catch (err) {
            console.error('Cover upload failed:', err);
        } finally {
            setCoverUploading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Hero Profile Section */}
            <div
                className={styles.heroSection}
                style={user.coverImageUrl ? {
                    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,245,237,0.5) 60%, rgba(255,245,237,0.92) 100%), url('${user.coverImageUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                } : undefined}
            >
                <div className={styles.heroContainer}>
                    {!editing && (
                        <div className={styles.editButtonWrapper}>
                            <label className={styles.coverUploadBtn} title="Đổi ảnh bìa">
                                {coverUploading ? (
                                    <span className="spinner" style={{ width: 16, height: 16 }} />
                                ) : (
                                    <Camera size={16} />
                                )}
                                Ảnh bìa
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleCoverUpload}
                                    disabled={coverUploading}
                                />
                            </label>
                            <button className={styles.editButton} onClick={() => setEditing(true)}>
                                <Edit2 size={16} />
                                Chỉnh sửa hồ sơ
                            </button>
                        </div>
                    )}

                    <div className={styles.heroContent}>
                        <div className={styles.avatarLarge}>
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.fullName} />
                            ) : (
                                user.fullName?.charAt(0)?.toUpperCase()
                            )}
                        </div>
                        <h1 className={styles.userName}>{user.fullName}</h1>
                        <div className={styles.roleBadge} style={{ background: role.color + '33', color: role.color }}>
                            {role.label}
                        </div>
                    </div>

                    <div className={styles.infoStats}>
                        <div className={styles.statCard}>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>
                                    <Mail size={16} color="#FF6E40" />
                                    Email
                                </span>
                                <span className={styles.statValue}>{user.email}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>
                                    <Phone size={16} color="#FF6E40" />
                                    Số điện thoại
                                </span>
                                <span className={styles.statValue}>{user.phone || 'Chưa có'}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>
                                    {user.isVerified ? (
                                        <CheckCircle size={16} color="#10B981" />
                                    ) : (
                                        <XCircle size={16} color="#6B7280" />
                                    )}
                                    Xác thực
                                </span>
                                <span className={styles.statValue} style={{ color: user.isVerified ? '#10B981' : '#6B7280' }}>
                                    {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                                </span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statContent}>
                                <span className={styles.statLabel}>
                                    <Calendar size={16} color="#FF6E40" />
                                    Tham gia
                                </span>
                                <span className={styles.statValue}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.navTabs}>
                <div className={styles.tabsContainer}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Tổng quan
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'bookings' ? styles.active : ''}`}
                        onClick={() => {
                            setActiveTab('bookings');
                            router.push('/bookings');
                        }}
                    >
                        Lịch sử đặt sân
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'matches' ? styles.active : ''}`}
                        onClick={() => {
                            setActiveTab('matches');
                            router.push('/matchmaking');
                        }}
                    >
                        Ghép trận
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'favorites' ? styles.active : ''}`}
                        onClick={() => setActiveTab('favorites')}
                    >
                        Yêu thích
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'notifications' ? styles.active : ''}`}
                        onClick={() => {
                            setActiveTab('notifications');
                            router.push('/notifications');
                        }}
                    >
                        Thông báo
                    </button>
                </div>
            </div>
            <div className={styles.mainContent}>
                <div className={styles.layout}>
                    <div className={styles.leftColumn}>
                        {/* Hàm chỉnh sửa */}
                        {editing && (
                            <div className={styles.editCard}>
                                <h2>Chỉnh sửa hồ sơ</h2>

                                {message && (
                                    <div className={styles.message} style={{ 
                                        background: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                                        color: message.type === 'success' ? '#10B981' : '#DC2626',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        {message.text}
                                    </div>
                                )}

                                <form onSubmit={handleSave}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Họ và tên</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={form.fullName}
                                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Số điện thoại</label>
                                        <input
                                            type="tel"
                                            className={styles.formInput}
                                            placeholder="0901234567"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Avatar URL</label>
                                        <input
                                            type="url"
                                            className={styles.formInput}
                                            placeholder="https://example.com/avatar.jpg"
                                            value={form.avatarUrl}
                                            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                                        />
                                    </div>

                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.saveButton} disabled={saving}>
                                            <Save size={16} />
                                            {saving ? 'Đang lưu...' : 'Lưu'}
                                        </button>
                                        <button 
                                            type="button" 
                                            className={styles.cancelButton} 
                                            onClick={() => { setEditing(false); setMessage(null); }}
                                        >
                                            <X size={16} />
                                            Hủy
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Activity Stats */}
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Thống kê hoạt động</h2>
                            <div className={styles.activityGrid}>
                                <div className={styles.activityBox}>
                                    <div className={`${styles.activityIconWrap} ${styles.purple}`}>
                                        <Building2 size={28} color="#8B5CF6" />
                                    </div>
                                    <div className={styles.activityNumber}>{stats.totalBookings}</div>
                                    <div className={styles.activityLabel}>Lượt đặt</div>
                                </div>
                                <div className={styles.activityBox}>
                                    <div className={`${styles.activityIconWrap} ${styles.yellow}`}>
                                        <Users size={28} color="#F59E0B" />
                                    </div>
                                    <div className={styles.activityNumber}>{stats.completedBookings}</div>
                                    <div className={styles.activityLabel}>Trận đấu</div>
                                </div>
                                <div className={styles.activityBox}>
                                    <div className={`${styles.activityIconWrap} ${styles.yellow}`}>
                                        <Star size={28} color="#F59E0B" />
                                    </div>
                                    <div className={styles.activityNumber}>{reviewCount}</div>
                                    <div className={styles.activityLabel}>Đánh giá</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>Đặt sân gần đây</h2>
                                <button className={styles.viewAllBtn} onClick={() => router.push('/bookings')}>
                                    Xem tất cả
                                    <ArrowRight size={16} />
                                </button>
                            </div>

                            {bookingsLoading ? (
                                // Skeleton loading
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[1,2,3].map(i => (
                                        <div key={i} style={{ height: 72, borderRadius: 12, background: 'linear-gradient(90deg,#F3F4F6 0%,#E5E7EB 50%,#F3F4F6 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                    ))}
                                </div>
                            ) : recentBookings.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <CalendarX className={styles.emptyIcon} size={64} color="#D1D5DB" />
                                    <div className={styles.emptyText}>Bạn chưa có lịch đặt sân nào</div>
                                    <button className={styles.emptyButton} onClick={() => router.push('/venues')}>
                                        Tìm sân ngay
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {recentBookings.map((booking) => {
                                        const statusMap = {
                                            PENDING_DEPOSIT: { label: 'Chờ cọc',     color: '#F59E0B', bg: '#FEF3C7' },
                                            CONFIRMED:       { label: 'Đã xác nhận', color: '#10B981', bg: '#D1FAE5' },
                                            CANCELLED:       { label: 'Đã hủy',      color: '#EF4444', bg: '#FEE2E2' },
                                            COMPLETED:       { label: 'Hoàn thành',  color: '#6B7280', bg: '#F3F4F6' },
                                            EXPIRED:         { label: 'Hết hạn',     color: '#9CA3AF', bg: '#F3F4F6' },
                                        };
                                        // Client-side: nếu đang chờ cọc nhưng đã hết thời gian giữ chỗ → hiển thị Hết hạn
                                        const isExpiredOnClient = booking.status === 'PENDING_DEPOSIT'
                                            && booking.holdExpiresAt
                                            && new Date(booking.holdExpiresAt) < new Date();
                                        const displayStatus = isExpiredOnClient ? 'EXPIRED' : booking.status;
                                        const s = statusMap[displayStatus] || statusMap.PENDING_DEPOSIT;
                                        return (
                                            <div
                                                key={booking.id}
                                                onClick={() => router.push('/bookings')}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 14,
                                                    padding: '14px 16px', borderRadius: 12,
                                                    background: '#F9FAFB', cursor: 'pointer',
                                                    border: '1px solid #F3F4F6',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                                            >
                                                {/* Icon */}
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 12,
                                                    background: '#DBEAFE', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <Calendar size={22} color="#3B82F6" />
                                                </div>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {booking.field?.venue?.name || 'Sân thể thao'}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                                        {booking.field?.name && `${booking.field.name} · `}
                                                        {booking.date && new Date(booking.date).toLocaleDateString('vi-VN')}
                                                        {booking.startTime && ` · ${booking.startTime}–${booking.endTime}`}
                                                    </div>
                                                </div>

                                                {/* Status badge */}
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: 20,
                                                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                                                    background: s.bg, color: s.color
                                                }}>
                                                    {s.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Quick Links */}
                    <div className={styles.rightColumn}>
                        <div className={`${styles.card} ${styles.quickLinks}`}>
                            <h3 className={styles.cardTitle}>Truy cập nhanh</h3>
                            <div className={styles.linkGrid}>
                                {user.role === 'CUSTOMER' && (
                                    <>
                                        <button className={styles.linkCard} onClick={() => router.push('/bookings')}>
                                            <div className={`${styles.linkIconWrap} ${styles.blue}`}>
                                                <Calendar size={24} color="#3B82F6" />
                                            </div>
                                            <strong>Đặt sân của tôi</strong>
                                        </button>
                                        <button className={styles.linkCard} onClick={() => router.push('/matchmaking')}>
                                            <div className={`${styles.linkIconWrap} ${styles.yellow}`}>
                                                <Trophy size={24} color="#F59E0B" />
                                            </div>
                                            <strong>Ghép trận</strong>
                                        </button>
                                    </>
                                )}
                                {user.role === 'OWNER' && (
                                    <>
                                        <button className={styles.linkCard} onClick={() => router.push('/owner/venues')}>
                                            <div className={`${styles.linkIconWrap} ${styles.blue}`}>
                                                <Building2 size={24} color="#3B82F6" />
                                            </div>
                                            <strong>Quản lý sân</strong>
                                        </button>
                                        <button className={styles.linkCard} onClick={() => router.push('/owner/bookings')}>
                                            <div className={`${styles.linkIconWrap} ${styles.yellow}`}>
                                                <ClipboardList size={24} color="#F59E0B" />
                                            </div>
                                            <strong>Lịch đặt sân</strong>
                                        </button>
                                    </>)}
                                {user.role === 'ADMIN' && (<>
                                        <button className={styles.linkCard} onClick={() => router.push('/admin/venues')}>
                                            <div className={`${styles.linkIconWrap} ${styles.blue}`}>
                                                <CheckSquare size={24} color="#3B82F6" />
                                            </div>
                                            <strong>Duyệt sân</strong>
                                        </button>
                                        <button className={styles.linkCard} onClick={() => router.push('/admin/users')}>
                                            <div className={`${styles.linkIconWrap} ${styles.yellow}`}>
                                                <Users size={24} color="#F59E0B" />
                                            </div>
                                            <strong>Quản lý users</strong>
                                        </button>
                                    </>
                                )}
                                <button className={styles.linkCard} onClick={() => router.push('/chat')}>
                                    <div className={`${styles.linkIconWrap} ${styles.purple}`}>
                                        <MessageCircle size={24} color="#8B5CF6" />
                                    </div>
                                    <strong>Tin nhắn</strong>
                                </button>
                                <button className={styles.linkCard} onClick={() => router.push('/notifications')}>
                                    <div className={`${styles.linkIconWrap} ${styles.orange}`}>
                                        <Bell size={24} color="#FF6E40" />
                                    </div>
                                    <strong>Thông báo</strong>
                                </button>
                                <button className={`${styles.linkCard} ${styles.supportLink}`} onClick={() => router.push('/support')}>
                                    <div className={`${styles.linkIconWrap}`} style={{ background: '#ecfdf5', color: '#10b981' }}>
                                        <Headphones size={24} />
                                    </div>
                                    <strong>Hỗ trợ</strong>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
