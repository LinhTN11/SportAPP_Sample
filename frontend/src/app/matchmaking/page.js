'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { matchmakingAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { CalendarDays, Clock, MapPin, Building2 } from 'lucide-react';
import styles from './matchmaking.module.css';

export default function MatchmakingPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('browse'); // browse | my | create
    const [posts, setPosts] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ sportType: '', city: '' });

    // Create post form
    const [form, setForm] = useState({
        bookingDate: '', startTime: '', endTime: '',
        sportType: 'football', city: '', district: '',
        description: '', autoMatchEnabled: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPosts();
        if (isAuthenticated) loadMyPosts();
    }, [isAuthenticated, filters]);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.sportType) params.sportType = filters.sportType;
            if (filters.city) params.city = filters.city;
            const { data } = await matchmakingAPI.searchPosts(params);
            setPosts(data.data.posts);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const loadMyPosts = async () => {
        try {
            const { data } = await matchmakingAPI.getMyPosts();
            setMyPosts(data.data.posts);
        } catch (err) { console.error(err); }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) { router.push('/login'); return; }
        setSubmitting(true);
        setError('');
        try {
            await matchmakingAPI.createPost(form);
            setActiveTab('my');
            loadMyPosts();
            loadPosts();
        } catch (err) {
            setError(err.response?.data?.message || 'Tạo bài đăng thất bại');
        } finally { setSubmitting(false); }
    };

    const handleSendRequest = async (postId) => {
        if (!isAuthenticated) { router.push('/login'); return; }
        try {
            await matchmakingAPI.sendRequest(postId);
            alert('Đã gửi lời mời ghép trận!');
            loadPosts();
        } catch (err) {
            alert(err.response?.data?.message || 'Gửi thất bại');
        }
    };

    const handleAccept = async (requestId) => {
        try {
            const { data } = await matchmakingAPI.acceptRequest(requestId);
            alert('Ghép trận thành công! Kiểm tra tin nhắn để trao đổi.');
            loadMyPosts();
        } catch (err) { alert(err.response?.data?.message || 'Thất bại'); }
    };

    const handleReject = async (requestId) => {
        try {
            await matchmakingAPI.rejectRequest(requestId);
            loadMyPosts();
        } catch (err) { alert('Thất bại'); }
    };

    const sportTypes = [
        { value: 'football', label: 'Bóng đá' },
        { value: 'badminton', label: 'Cầu lông' },
        { value: 'tennis', label: 'Tennis' },
        { value: 'basketball', label: 'Bóng rổ' },
        { value: 'volleyball', label: 'Bóng chuyền' },
        { value: 'pickleball', label: 'Pickleball' },
    ];

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <h1 className="heading-lg">Ghép trận 🤝</h1>
                    <p className={styles.subtitle}>Tìm đối thủ hoặc để hệ thống tự ghép cho bạn</p>
                </div>

                {/* Tabs */}
                <div className={styles.tabBar}>
                    <button className={`tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
                        Tìm đối
                    </button>
                    <button className={`tab ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
                        Bài của tôi
                    </button>
                    <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                        Tạo bài
                    </button>
                </div>

                {/* Browse Posts */}
                {activeTab === 'browse' && (
                    <>
                        <div className={styles.filters}>
                            <select value={filters.sportType} onChange={(e) => setFilters({ ...filters, sportType: e.target.value })}>
                                <option value="">Tất cả môn</option>
                                {sportTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <input type="text" placeholder="Tìm theo thành phố..." value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
                        </div>

                        {loading ? (
                            <div className={styles.grid}>{[1, 2, 3].map(i => <div key={i} className={styles.skeletonCard}><div className="skeleton" style={{ height: 20, width: '50%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '70%' }} /></div>)}</div>
                        ) : posts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🤝</div>
                                <div className="empty-state-title">Chưa có bài ghép trận</div>
                                <div className="empty-state-text">Hãy tạo bài đăng để tìm đối thủ</div>
                                <button className="btn btn-primary" onClick={() => setActiveTab('create')}>Tạo bài →</button>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {posts.map((post) => {
                                    const sportIconMap = {
                                        all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
                                        football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6l3 4-1 4H10l-1-4z"/><path d="M12 6V2"/><path d="M15 10l5-2"/><path d="M14 14l3 5"/><path d="M10 14l-3 5"/><path d="M9 10L4 8"/></svg>,
                                        badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4"/><path d="M10 22h4"/><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z"/><path d="M9 6v2"/><path d="M12 6v2"/><path d="M15 6v2"/></svg>,
                                        tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/></svg>,
                                        basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                                        volleyball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2C6.5 2 2 6.5 2 12"/><path d="M12 2c3 3 4 8 1 13"/><path d="M2 12c3-1 8-2 13 1"/></svg>,
                                        pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="12" cy="15" r="1"/></svg>,
                                    };
                                    const sportIcon = sportIconMap[post.sportType] || sportIconMap.all;
                                    return (
                                    <div key={post.id} className={styles.postCard}>
                                        {/* Header */}
                                        <div className={styles.postHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                                    <Avatar user={post.user} size="md" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{post.user?.fullName}</div>
                                                    {post.autoMatchEnabled && (
                                                        <span style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, marginTop: 2 }}>Tự động</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span style={{ background: '#DEF7EC', color: '#03543F', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>Đang tìm</span>
                                        </div>

                                        {/* Body */}
                                        <div className={styles.postBody}>
                                            {/* Môn thể thao */}
                                            <div className={styles.postTag}>
                                                <span style={{ fontSize: 20, color: '#FF5733', display: 'flex', alignItems: 'center' }}>{sportIcon}</span>
                                                {sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}
                                            </div>

                                            {/* Detail grid 2 cột */}
                                            <div className={styles.detailGrid}>
                                                <div className={styles.postDetail}>
                                                    <CalendarDays size={20} color="#FF5733" />
                                                    {new Date(post.bookingDate).toLocaleDateString('vi-VN')}
                                                </div>
                                                <div className={styles.postDetail}>
                                                    <Clock size={20} color="#FF5733" />
                                                    {post.startTime} – {post.endTime}
                                                </div>
                                                <div className={`${styles.postDetail} ${styles.postDetailFull}`}>
                                                    <MapPin size={20} color="#FF5733" />
                                                    {post.city}{post.district ? `, ${post.district}` : ''}
                                                </div>
                                                {post.field && (
                                                    <div className={`${styles.postDetail} ${styles.postDetailFull}`}>
                                                        <Building2 size={20} color="#FF5733" />
                                                        {post.field.venue?.name}
                                                    </div>
                                                )}
                                            </div>
                                            {post.description && <p className={styles.postDesc}>{post.description}</p>}
                                        </div>

                                        {/* Divider + nút */}
                                        {user?.id !== post.userId && (
                                            <>
                                                <div className={styles.divider} />
                                                <button className={styles.btnInvite} onClick={() => handleSendRequest(post.id)}>
                                                    Gửi lời mời
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* My Posts */}
                {activeTab === 'my' && (
                    <div className={styles.grid}>
                        {myPosts.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                                <div className="empty-state-icon">📋</div>
                                <div className="empty-state-title">Bạn chưa có bài đăng</div>
                                <button className="btn btn-primary" onClick={() => setActiveTab('create')}>Tạo ngay →</button>
                            </div>
                        ) : myPosts.map((post) => {
                            const sportIconMap = {
                                all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
                                football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6l3 4-1 4H10l-1-4z"/><path d="M12 6V2"/><path d="M15 10l5-2"/><path d="M14 14l3 5"/><path d="M10 14l-3 5"/><path d="M9 10L4 8"/></svg>,
                                badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4"/><path d="M10 22h4"/><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z"/><path d="M9 6v2"/><path d="M12 6v2"/><path d="M15 6v2"/></svg>,
                                tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/></svg>,
                                basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                                volleyball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2C6.5 2 2 6.5 2 12"/><path d="M12 2c3 3 4 8 1 13"/><path d="M2 12c3-1 8-2 13 1"/></svg>,
                                pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="12" cy="15" r="1"/></svg>,
                            };
                            const sportIcon = sportIconMap[post.sportType] || sportIconMap.all;
                            return (
                            <div key={post.id} className={styles.postCard}>
                                {/* Header: Avatar + tên + badge trạng thái */}
                                <div className={styles.postHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                            <Avatar user={user} size="md" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{user?.fullName}</div>
                                            {post.autoMatchEnabled && (
                                                <span style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, marginTop: 2 }}>Tự động</span>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{
                                        background: post.status === 'OPEN' ? '#DEF7EC' : post.status === 'MATCHED' ? '#E1EFFE' : '#F3F4F6',
                                        color: post.status === 'OPEN' ? '#03543F' : post.status === 'MATCHED' ? '#1E40AF' : '#6B7280',
                                        fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap'
                                    }}>
                                        {post.status === 'OPEN' ? 'Đang tìm' : post.status === 'MATCHED' ? 'Đã ghép' : post.status}
                                    </span>
                                </div>

                                {/* Body */}
                                <div className={styles.postBody}>
                                    <div className={styles.postTag}>
                                        <span style={{ fontSize: 20, color: '#FF5733', display: 'flex', alignItems: 'center' }}>{sportIcon}</span>
                                        {sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}
                                    </div>
                                    <div className={styles.detailGrid}>
                                        <div className={styles.postDetail}>
                                            <CalendarDays size={20} color="#FF5733" />
                                            {new Date(post.bookingDate).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className={styles.postDetail}>
                                            <Clock size={20} color="#FF5733" />
                                            {post.startTime} – {post.endTime}
                                        </div>
                                    </div>
                                </div>

                                {/* Lời mời */}
                                {post.matchRequests?.length > 0 && (
                                    <div className={styles.requestList}>
                                        <div className={styles.requestLabel}>Lời mời ({post.matchRequests.length})</div>
                                        {post.matchRequests.map((req) => (
                                            <div key={req.id} className={styles.requestItem}>
                                                <div className={styles.requestUser}>
                                                    <Avatar user={req.requester} size="sm" />
                                                    <span style={{ fontSize: 13, color: '#1A1A1A' }}>{req.requester?.fullName}</span>
                                                    <span className={`badge ${req.status === 'PENDING' ? 'badge-warning' : req.status === 'ACCEPTED' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                        {req.status === 'PENDING' ? 'Chờ' : req.status === 'ACCEPTED' ? 'Đã chấp nhận' : req.status}
                                                    </span>
                                                </div>
                                                {req.status === 'PENDING' && (
                                                    <div className={styles.requestActions}>
                                                        <button className={styles.btnAccept} onClick={() => handleAccept(req.id)}>Chấp nhận</button>
                                                        <button className={styles.btnReject} onClick={() => handleReject(req.id)}>Từ chối</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Create Post */}
                {activeTab === 'create' && (
                    <div className={styles.createForm}>
                        <div className={styles.formCard}>
                            <h2 className="heading-sm">Tạo bài tìm đối</h2>
                            <p className="caption" style={{ marginBottom: 20 }}>Điền thông tin để tìm đối thủ phù hợp</p>

                            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

                            <form onSubmit={handleCreatePost}>
                                <div className="form-group">
                                    <label className="form-label">Môn thể thao</label>
                                    <select className="form-input form-select" value={form.sportType} onChange={(e) => setForm({ ...form, sportType: e.target.value })} required>
                                        {sportTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Ngày chơi</label>
                                        <input type="date" className="form-input" value={form.bookingDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setForm({ ...form, bookingDate: e.target.value })} required />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Từ</label>
                                        <input type="time" className="form-input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Đến</label>
                                        <input type="time" className="form-input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Thành phố</label>
                                        <input type="text" className="form-input" placeholder="Hồ Chí Minh" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Quận/Huyện</label>
                                        <input type="text" className="form-input" placeholder="Quận 1" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Ghi chú</label>
                                    <textarea className="form-input" placeholder="Mô tả thêm..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                                </div>

                                <div className={styles.autoMatch}>
                                    <label className={styles.switchLabel}>
                                        <input type="checkbox" checked={form.autoMatchEnabled} onChange={(e) => setForm({ ...form, autoMatchEnabled: e.target.checked })} />
                                        <span className={styles.switchTrack}><span className={styles.switchThumb} /></span>
                                        <div>
                                            <strong>Ghép tự động</strong>
                                            <span className="caption">Hệ thống tự tìm người trùng điều kiện</span>
                                        </div>
                                    </label>
                                </div>

                                <button type="submit" className={styles.btnInvite} style={{ fontSize: 15, padding: '12px', borderRadius: 12 }} disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Đăng tìm đối →'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}