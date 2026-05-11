/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { matchmakingAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { CalendarDays, Clock, MapPin, Building2, ChevronDown, Users, ClipboardList } from 'lucide-react';
import styles from './matchmaking.module.css';
import DatePicker from '@/components/ui/DatePicker';

// Import MapPicker động (giống trang Owner)
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function MatchmakingPage() {
    return (
        <Suspense fallback={<div className={styles.page}><div className="container"><div className="spinner" /></div></div>}>
            <MatchmakingContent />
        </Suspense>
    );
}

function MatchmakingContent() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('browse'); // browse | my | create
    const [posts, setPosts] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ sportType: '', city: '' });
    
    // State và Ref cho Custom Dropdown (Tìm đối)
    const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
    const sportDropdownRef = useRef(null);

    // State và Ref cho Custom Dropdown (Tạo bài - Môn thể thao)
    const [isCreateSportDropdownOpen, setIsCreateSportDropdownOpen] = useState(false);
    const createSportDropdownRef = useRef(null);

    // State và Ref cho Custom Dropdown (Tạo bài - Giờ bắt đầu & Kết thúc)
    const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
    const startTimeDropdownRef = useRef(null);
    const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
    const endTimeDropdownRef = useRef(null);

    // form tạo bài đăng
    const [form, setForm] = useState({
        bookingDate: '', startTime: '', endTime: '',
        sportType: 'football', address: '', city: '', district: '', latitude: '', longitude: '',
        description: '', autoMatchEnabled: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // State quản lý bản đồ
    const [mapLocation, setMapLocation] = useState({});

    // danh sách giờ (Mỗi 30 phút từ 05:00 đến 23:30)
    const generateTimeOptions = () => {
        const times = [];
        for (let h = 5; h <= 23; h++) {
            const hour = h.toString().padStart(2, '0');
            times.push(`${hour}:00`);
            times.push(`${hour}:30`);
        }
        return times;
    };
    const timeOptions = generateTimeOptions();

    // Hàm xử lý khi chọn địa điểm trên bản đồ
    const handleMapChange = (loc) => {
        setMapLocation(loc);
        setForm(prev => ({
            ...prev,
            address: loc.address || prev.address,
            city: loc.city || prev.city,
            district: loc.district || prev.district,
            latitude: loc.latitude || prev.latitude,
            longitude: loc.longitude || prev.longitude,
        }));
    };

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sportDropdownRef.current && !sportDropdownRef.current.contains(e.target)) {
                setIsSportDropdownOpen(false);
            }
            if (createSportDropdownRef.current && !createSportDropdownRef.current.contains(e.target)) {
                setIsCreateSportDropdownOpen(false);
            }
            if (startTimeDropdownRef.current && !startTimeDropdownRef.current.contains(e.target)) {
                setIsStartTimeOpen(false);
            }
            if (endTimeDropdownRef.current && !endTimeDropdownRef.current.contains(e.target)) {
                setIsEndTimeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        if (!form.startTime || !form.endTime || !form.bookingDate) {
            setError('Vui lòng chọn đầy đủ ngày và giờ');
            return;
        }
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

    const searchParams = useSearchParams();
    const highlightPostId = searchParams.get('post');

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

    // Auto-scroll to highlighted post
    useEffect(() => {
        if (highlightPostId && posts.length > 0) {
            setTimeout(() => {
                const element = document.getElementById(`post-${highlightPostId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add(styles.highlightedCard);
                    setTimeout(() => element.classList.remove(styles.highlightedCard), 3000);
                }
            }, 500);
        }
    }, [highlightPostId, posts]);
    
    // chấp nhận lời mơid
    const handleAccept = async (requestId) => {
        try {
            const { data } = await matchmakingAPI.acceptRequest(requestId);
            alert('Ghép trận thành công! Kiểm tra tin nhắn để trao đổi.');
            loadMyPosts();
            const roomId = data?.data?.chatRoomId;
            if (roomId) {
                router.push(`/chat?room=${roomId}`);
            }
        } catch (err) { alert(err.response?.data?.message || 'Thất bại'); }
    };
    
    // từ chối
    const handleReject = async (requestId) => {
        try {
            await matchmakingAPI.rejectRequest(requestId);
            loadMyPosts();
        } catch (err) { alert('Thất bại'); }
    };

    const SportIcons = {
        all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
        football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6l3 4-1 4H10l-1-4z"/><path d="M12 6V2"/><path d="M15 10l5-2"/><path d="M14 14l3 5"/><path d="M10 14l-3 5"/><path d="M9 10L4 8"/></svg>,
        badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4"/><path d="M10 22h4"/><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z"/><path d="M9 6v2"/><path d="M12 6v2"/><path d="M15 6v2"/></svg>,
        tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/></svg>,
        basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
        volleyball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2C6.5 2 2 6.5 2 12"/><path d="M12 2c3 3 4 8 1 13"/><path d="M2 12c3-1 8-2 13 1"/></svg>,
        pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="12" cy="15" r="1"/></svg>,
    };

    const sportTypes = [
        { value: '', label: 'Tất cả môn', icon: SportIcons.all },
        { value: 'football', label: 'Bóng đá', icon: SportIcons.football },
        { value: 'badminton', label: 'Cầu lông', icon: SportIcons.badminton },
        { value: 'tennis', label: 'Tennis', icon: SportIcons.tennis },
        { value: 'basketball', label: 'Bóng rổ', icon: SportIcons.basketball },
        { value: 'volleyball', label: 'Bóng chuyền', icon: SportIcons.volleyball },
        { value: 'pickleball', label: 'Pickleball', icon: SportIcons.pickleball },
    ];

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <h1 className="heading-lg">Ghép trận <Users size={28} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /></h1>
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
                            {/* Custom Dropdown Tìm Đối */}
                            <div className={styles.customDropdown} ref={sportDropdownRef}>
                                <div 
                                    className={`${styles.dropdownTrigger} ${isSportDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                    onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.dropdownOptionIcon}>
                                            {sportTypes.find(s => s.value === filters.sportType)?.icon || SportIcons.all}
                                        </span>
                                        <span>
                                            {filters.sportType === '' 
                                                ? 'Tất cả môn' 
                                                : sportTypes.find(s => s.value === filters.sportType)?.label}
                                        </span>
                                    </div>
                                    <span className={`${styles.dropdownChevron} ${isSportDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                        <ChevronDown size={16} />
                                    </span>
                                </div>

                                {isSportDropdownOpen && (
                                    <div className={styles.dropdownMenu}>
                                        {sportTypes.map(s => (
                                            <div 
                                                key={s.value}
                                                className={`${styles.dropdownOption} ${filters.sportType === s.value ? styles.dropdownOptionActive : ''}`}
                                                onClick={() => { 
                                                    setFilters({ ...filters, sportType: s.value }); 
                                                    setIsSportDropdownOpen(false); 
                                                }}
                                            >
                                                <span className={styles.dropdownOptionIcon}>{s.icon}</span>
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <input type="text" placeholder="Tìm theo thành phố..." value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
                        </div>

                        {loading ? (
                            <div className={styles.grid}>{[1, 2, 3].map(i => <div key={i} className={styles.skeletonCard}><div className="skeleton" style={{ height: 20, width: '50%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '70%' }} /></div>)}</div>
                        ) : posts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><Users size={48} color="#D1D5DB" /></div>
                                <div className="empty-state-title">Chưa có bài ghép trận</div>
                                <div className="empty-state-text">Hãy tạo bài đăng để tìm đối thủ</div>
                                <button className="btn btn-primary" onClick={() => setActiveTab('create')}>Tạo bài →</button>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {posts.map((post) => {
                                    const sportIcon = SportIcons[post.sportType] || SportIcons.all;
                                    return (
                                    <div key={post.id} id={`post-${post.id}`} className={`${styles.postCard} ${highlightPostId === post.id.toString() ? styles.highlightedCard : ''}`}>
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
                                                <span style={{ fontSize: 18, color: '#FF5733', display: 'flex', alignItems: 'center' }}>{sportIcon}</span>
                                                {sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}
                                            </div>

                                            {/* Detail grid 2 cột */}
                                            <div className={styles.detailGrid}>
                                                <div className={styles.postDetail}>
                                                    <CalendarDays size={14} color="#FF5733" />
                                                    {new Date(post.bookingDate).toLocaleDateString('vi-VN')}
                                                </div>
                                                <div className={styles.postDetail}>
                                                    <Clock size={14} color="#FF5733" />
                                                    {post.startTime} – {post.endTime}
                                                </div>
                                                <div className={`${styles.postDetail} ${styles.postDetailFull}`}>
                                                    <MapPin size={14} color="#FF5733" />
                                                    {post.city}{post.district ? `, ${post.district}` : ''}
                                                </div>
                                                {/* chỉ hiện khi liên kết với sân con */}
                                                {post.field && (
                                                    <div className={`${styles.postDetail} ${styles.postDetailFull}`}>
                                                        <Building2 size={14} color="#FF5733" />
                                                        {post.field.venue?.name}
                                                    </div>
                                                )}
                                            </div>
                                            {post.description && <p className={styles.postDesc}>{post.description}</p>}
                                        </div>

                                        {/* Divider + nút : chỉ hiện khi ko phải bài mình*/}
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
                                <div className="empty-state-icon"><ClipboardList size={48} color="#D1D5DB" /></div>
                                <div className="empty-state-title">Bạn chưa có bài đăng</div>
                                <button className="btn btn-primary" onClick={() => setActiveTab('create')}>Tạo ngay →</button>
                            </div>
                        ) : myPosts.map((post) => {
                            const sportIcon = SportIcons[post.sportType] || SportIcons.all;
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
                                        <span style={{ fontSize: 18, color: '#FF5733', display: 'flex', alignItems: 'center' }}>{sportIcon}</span>
                                        {sportTypes.find(s => s.value === post.sportType)?.label || post.sportType}
                                    </div>
                                    <div className={styles.detailGrid}>
                                        <div className={styles.postDetail}>
                                            <CalendarDays size={14} color="#FF5733" />
                                            {new Date(post.bookingDate).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className={styles.postDetail}>
                                            <Clock size={14} color="#FF5733" />
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
                                <div className="form-group" style={{ position: 'relative', zIndex: 10 }}>
                                    <label className="form-label">Môn thể thao</label>
                                    <div className={styles.customDropdown} ref={createSportDropdownRef}>
                                        <div 
                                            className={`${styles.dropdownTrigger} ${isCreateSportDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                            onClick={() => setIsCreateSportDropdownOpen(!isCreateSportDropdownOpen)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={styles.dropdownOptionIcon}>
                                                    {sportTypes.find(s => s.value === form.sportType)?.icon || SportIcons.football}
                                                </span>
                                                <span>
                                                    {sportTypes.find(s => s.value === form.sportType)?.label || 'Bóng đá'}
                                                </span>
                                            </div>
                                            <span className={`${styles.dropdownChevron} ${isCreateSportDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                                <ChevronDown size={16} />
                                            </span>
                                        </div>

                                        {isCreateSportDropdownOpen && (
                                            <div className={styles.dropdownMenu}>
                                                {sportTypes.filter(s => s.value !== '').map(s => (
                                                    <div 
                                                        key={s.value}
                                                        className={`${styles.dropdownOption} ${form.sportType === s.value ? styles.dropdownOptionActive : ''}`}
                                                        onClick={() => { 
                                                            setForm({ ...form, sportType: s.value }); 
                                                            setIsCreateSportDropdownOpen(false); 
                                                        }}
                                                    >
                                                        <span className={styles.dropdownOptionIcon}>{s.icon}</span>
                                                        {s.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 9 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Ngày chơi</label>
                                        <DatePicker 
                                           value={form.bookingDate} 
                                           onChange={(val) => setForm({ ...form, bookingDate: val })} 
                                           minDate={new Date().toISOString().split('T')[0]} 
                                        />
                                    </div>
                                </div>

                                {/* ==== CỤM CHỌN GIỜ ĐÃ NÂNG CẤP ==== */}
                                <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 8 }}>
                                    {/* Từ giờ */}
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Từ</label>
                                        <div className={styles.customDropdown} ref={startTimeDropdownRef}>
                                            <div 
                                                className={`${styles.dropdownTrigger} ${isStartTimeOpen ? styles.dropdownTriggerOpen : ''}`}
                                                onClick={() => setIsStartTimeOpen(!isStartTimeOpen)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={styles.dropdownOptionIcon} style={{ color: '#6B7280' }}><Clock size={16} /></span>
                                                    <span>{form.startTime || 'Chọn giờ'}</span>
                                                </div>
                                                <span className={`${styles.dropdownChevron} ${isStartTimeOpen ? styles.dropdownChevronOpen : ''}`}>
                                                    <ChevronDown size={16} />
                                                </span>
                                            </div>

                                            {isStartTimeOpen && (
                                                <div className={styles.dropdownMenu} style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                    {timeOptions.map(time => (
                                                        <div 
                                                            key={`start-${time}`}
                                                            className={`${styles.dropdownOption} ${form.startTime === time ? styles.dropdownOptionActive : ''}`}
                                                            onClick={() => { 
                                                                setForm({ ...form, startTime: time }); 
                                                                setIsStartTimeOpen(false); 
                                                            }}
                                                        >
                                                            {time}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Đến giờ */}
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Đến</label>
                                        <div className={styles.customDropdown} ref={endTimeDropdownRef}>
                                            <div 
                                                className={`${styles.dropdownTrigger} ${isEndTimeOpen ? styles.dropdownTriggerOpen : ''}`}
                                                onClick={() => setIsEndTimeOpen(!isEndTimeOpen)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={styles.dropdownOptionIcon} style={{ color: '#6B7280' }}><Clock size={16} /></span>
                                                    <span>{form.endTime || 'Chọn giờ'}</span>
                                                </div>
                                                <span className={`${styles.dropdownChevron} ${isEndTimeOpen ? styles.dropdownChevronOpen : ''}`}>
                                                    <ChevronDown size={16} />
                                                </span>
                                            </div>

                                            {isEndTimeOpen && (
                                                <div className={styles.dropdownMenu} style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                    {timeOptions.map(time => (
                                                        <div 
                                                            key={`end-${time}`}
                                                            className={`${styles.dropdownOption} ${form.endTime === time ? styles.dropdownOptionActive : ''}`}
                                                            onClick={() => { 
                                                                setForm({ ...form, endTime: time }); 
                                                                setIsEndTimeOpen(false); 
                                                            }}
                                                        >
                                                            {time}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ position: 'relative', zIndex: 7 }}>
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <MapPin size={16} /> Chọn vị trí trên bản đồ *
                                    </label>
                                    <MapPicker
                                        value={mapLocation}
                                        onChange={handleMapChange}
                                        height={300}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label">Địa chỉ *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền từ bản đồ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Thành phố *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Quận/Huyện *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required />
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
