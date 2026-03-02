'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { matchmakingAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
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
        { value: 'football', label: '⚽ Bóng đá' },
        { value: 'badminton', label: '🏸 Cầu lông' },
        { value: 'tennis', label: '🎾 Tennis' },
        { value: 'basketball', label: '🏀 Bóng rổ' },
        { value: 'volleyball', label: '🏐 Bóng chuyền' },
        { value: 'pickleball', label: '🏓 Pickleball' },
    ];

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <h1 className="heading-lg">Ghép trận 🤝</h1>
                    <p className={styles.subtitle}>Tìm đối thủ hoặc để hệ thống tự ghép cho bạn</p>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: 24 }}>
                    <button className={`tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
                        🔍 Tìm đối
                    </button>
                    <button className={`tab ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>
                        📋 Bài của tôi
                    </button>
                    <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                        ✏️ Tạo bài
                    </button>
                </div>

                {/* Browse Posts */}
                {activeTab === 'browse' && (
                    <>
                        <div className={styles.filters}>
                            <select className="form-input form-select" value={filters.sportType} onChange={(e) => setFilters({ ...filters, sportType: e.target.value })}>
                                <option value="">Tất cả môn</option>
                                {sportTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <input type="text" className="form-input" placeholder="🔍 Tìm theo thành phố..." value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
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
                                {posts.map((post) => (
                                    <div key={post.id} className={styles.postCard}>
                                        <div className={styles.postHeader}>
                                            <Avatar user={post.user} size="sm" />
                                            <div>
                                                <strong className="body-sm">{post.user?.fullName}</strong>
                                                {post.autoMatchEnabled && <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: 10 }}>Auto</span>}
                                            </div>
                                        </div>
                                        <div className={styles.postBody}>
                                            <div className={styles.postTag}>
                                                {sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}
                                            </div>
                                            <div className={styles.postDetail}>📅 {new Date(post.bookingDate).toLocaleDateString('vi-VN')}</div>
                                            <div className={styles.postDetail}>🕐 {post.startTime} - {post.endTime}</div>
                                            <div className={styles.postDetail}>📍 {post.city}{post.district ? `, ${post.district}` : ''}</div>
                                            {post.field && <div className={styles.postDetail}>🏟️ {post.field.venue?.name}</div>}
                                            {post.description && <p className={styles.postDesc}>{post.description}</p>}
                                        </div>
                                        {user?.id !== post.userId && (
                                            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => handleSendRequest(post.id)}>
                                                🤝 Gửi lời mời
                                            </button>
                                        )}
                                    </div>
                                ))}
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
                        ) : myPosts.map((post) => (
                            <div key={post.id} className={styles.postCard}>
                                <div className={styles.postHeader}>
                                    <span className={`badge ${post.status === 'OPEN' ? 'badge-success' : post.status === 'MATCHED' ? 'badge-primary' : 'badge-neutral'}`}>
                                        {post.status === 'OPEN' ? 'Đang tìm' : post.status === 'MATCHED' ? 'Đã ghép' : post.status}
                                    </span>
                                    {post.autoMatchEnabled && <span className="badge badge-warning" style={{ fontSize: 10 }}>Tự động</span>}
                                </div>
                                <div className={styles.postBody}>
                                    <div className={styles.postTag}>{sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}</div>
                                    <div className={styles.postDetail}>📅 {new Date(post.bookingDate).toLocaleDateString('vi-VN')}</div>
                                    <div className={styles.postDetail}>🕐 {post.startTime} - {post.endTime}</div>
                                </div>

                                {/* Incoming requests */}
                                {post.matchRequests?.length > 0 && (
                                    <div className={styles.requestList}>
                                        <strong className="caption">Lời mời ({post.matchRequests.length})</strong>
                                        {post.matchRequests.map((req) => (
                                            <div key={req.id} className={styles.requestItem}>
                                                <div className={styles.requestUser}>
                                                    <Avatar user={req.requester} size="sm" />
                                                    <span className="body-sm">{req.requester?.fullName}</span>
                                                    <span className={`badge ${req.status === 'PENDING' ? 'badge-warning' : req.status === 'ACCEPTED' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                                                        {req.status === 'PENDING' ? 'Chờ' : req.status === 'ACCEPTED' ? 'Đã chấp nhận' : req.status}
                                                    </span>
                                                </div>
                                                {req.status === 'PENDING' && (
                                                    <div className={styles.requestActions}>
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req.id)}>✅</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleReject(req.id)}>❌</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
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

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
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
