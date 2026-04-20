'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatAPI } from '@/lib/api';
import styles from '../dashboard/dashboard.module.css';
import { MessageSquare, RefreshCcw, User, Clock, ChevronRight, ShieldCheck } from 'lucide-react';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminSupportPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, user, router]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const { data } = await chatAPI.getRooms();
            // Filter to direct rooms with non-admin users (support chats)
            const supportRooms = (data.data.rooms || []).filter(room => {
                if (room.type !== 'DIRECT') return false;
                const otherMember = room.members?.find(m => m.userId !== user?.id);
                return otherMember && otherMember.user?.role !== 'ADMIN';
            });
            setRooms(supportRooms);
        } catch (err) {
            console.error('Fetch support rooms error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') fetchRooms();
    }, [user]);

    const openChat = (room) => {
        const otherMember = room.members?.find(m => m.userId !== user?.id);
        if (otherMember) {
            router.push(`/chat?user=${otherMember.userId}`);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return d.toLocaleDateString('vi-VN');
    };

    const getRoleBadge = (role) => {
        if (role === 'OWNER') return { label: 'Chủ sân', color: '#3b82f6', bg: '#eff6ff' };
        if (role === 'CUSTOMER') return { label: 'Người dùng', color: '#10b981', bg: '#f0fdf4' };
        return { label: role, color: '#64748b', bg: '#f1f5f9' };
    };

    if (authLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingOverlay}>
                    <RefreshCcw className="spinner" size={40} style={{ color: '#3b82f6' }} />
                    <p>Đang tải hộp thư hỗ trợ...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container">
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Hộp thư hỗ trợ</h1>
                        <p className={styles.subtitle}>
                            Tất cả cuộc hội thoại hỗ trợ từ người dùng và chủ sân
                        </p>
                    </div>
                    <button
                        onClick={fetchRooms}
                        className={styles.panelAction}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', background: 'white', cursor: 'pointer' }}
                    >
                        <RefreshCcw size={16} /> Làm mới
                    </button>
                </header>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                    {[
                        { label: 'Tổng hội thoại', value: rooms.length, icon: <MessageSquare size={20} />, color: '#3b82f6' },
                        { label: 'Chủ sân', value: rooms.filter(r => r.members?.find(m => m.userId !== user?.id)?.user?.role === 'OWNER').length, icon: <ShieldCheck size={20} />, color: '#8b5cf6' },
                        { label: 'Người dùng', value: rooms.filter(r => r.members?.find(m => m.userId !== user?.id)?.user?.role === 'CUSTOMER').length, icon: <User size={20} />, color: '#10b981' },
                    ].map((s, i) => (
                        <div key={i} className={styles.statCard} style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {s.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Room list */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Cuộc hội thoại hỗ trợ</h2>
                    </div>

                    {rooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 600 }}>Chưa có cuộc hội thoại nào</p>
                            <p style={{ fontSize: '14px', marginTop: '6px' }}>Người dùng sẽ xuất hiện ở đây khi họ liên hệ hỗ trợ</p>
                        </div>
                    ) : (
                        <div>
                            {rooms.map(room => {
                                const other = room.members?.find(m => m.userId !== user?.id);
                                const otherUser = other?.user;
                                const badge = getRoleBadge(otherUser?.role);
                                const lastMsg = room.lastMessage;
                                const avatarSrc = otherUser?.avatarUrl
                                    ? (otherUser.avatarUrl.startsWith('http') ? otherUser.avatarUrl : `${SERVER_URL}${otherUser.avatarUrl}`)
                                    : null;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => openChat(room)}
                                        style={{
                                            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                                            gap: '16px', padding: '16px 20px', border: 'none', background: 'none',
                                            borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        {/* Avatar */}
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                                            {avatarSrc
                                                ? <img src={avatarSrc} alt={otherUser?.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : (otherUser?.fullName?.charAt(0)?.toUpperCase() || '?')
                                            }
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{otherUser?.fullName || 'Ẩn danh'}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: badge.bg, color: badge.color }}>{badge.label}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {lastMsg?.content?.startsWith('{') ? 'Thông báo hệ thống' : (lastMsg?.content || 'Bắt đầu cuộc trò chuyện...')}
                                            </div>
                                        </div>

                                        {/* Time + chevron */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                                <Clock size={12} /> {formatTime(lastMsg?.createdAt)}
                                            </div>
                                            <ChevronRight size={18} color="#cbd5e1" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
