'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { chatAPI, getImageUrl } from '@/lib/api';
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
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            border: '1.5px solid #e2e8f0', 
                            padding: '10px 22px', 
                            borderRadius: '14px', 
                            background: 'white', 
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#0f172a',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                        }}
                    >
                        <RefreshCcw size={18} className={loading ? 'spinner' : ''} /> Làm mới
                    </button>
                </header>

                {/* Stats row */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '24px', 
                    marginBottom: '32px' 
                }}>
                    {[
                        { label: 'Tổng hội thoại', value: rooms.length, icon: <MessageSquare size={24} />, color: '#3b82f6' },
                        { label: 'Chủ sân', value: rooms.filter(r => r.members?.find(m => m.userId !== user?.id)?.user?.role === 'OWNER').length, icon: <ShieldCheck size={24} />, color: '#8b5cf6' },
                        { label: 'Người dùng', value: rooms.filter(r => r.members?.find(m => m.userId !== user?.id)?.user?.role === 'CUSTOMER').length, icon: <User size={24} />, color: '#10b981' },
                    ].map((s, i) => (
                        <div key={i} className={styles.statCard} style={{ 
                            padding: '32px 24px', 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ 
                                width: 56, 
                                height: 56, 
                                borderRadius: '18px', 
                                background: `${s.color}10`, 
                                color: s.color, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                marginBottom: '4px',
                                border: `1.5px solid ${s.color}20`
                            }}>
                                {s.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
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
                                const avatarSrc = getImageUrl(otherUser?.avatarUrl);

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => openChat(room)}
                                        style={{
                                            width: '100%', 
                                            textAlign: 'left', 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            gap: '20px', 
                                            padding: '20px 24px', 
                                            border: 'none', 
                                            background: 'none',
                                            borderBottom: '1px solid #f1f5f9', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        {/* Avatar */}
                                        <div style={{ 
                                            width: 52, 
                                            height: 52, 
                                            borderRadius: '16px', 
                                            background: 'linear-gradient(135deg, #6366f1, #3b82f6)', 
                                            color: 'white', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            fontSize: '20px', 
                                            fontWeight: 700, 
                                            flexShrink: 0, 
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)'
                                        }}>
                                            {avatarSrc
                                                ? <img src={avatarSrc} alt={otherUser?.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : (otherUser?.fullName?.charAt(0)?.toUpperCase() || '?')
                                            }
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>{otherUser?.fullName || 'Ẩn danh'}</span>
                                                <span style={{ 
                                                    fontSize: '10px', 
                                                    fontWeight: 800, 
                                                    padding: '3px 10px', 
                                                    borderRadius: '8px', 
                                                    background: badge.bg, 
                                                    color: badge.color,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>{badge.label}</span>
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                                                {lastMsg?.content?.startsWith('{') ? 'Thông báo hệ thống' : (lastMsg?.content || 'Bắt đầu cuộc trò chuyện...')}
                                            </div>
                                        </div>

                                        {/* Time + chevron */}
                                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: '#94a3b8', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                marginBottom: '8px',
                                                fontWeight: 600
                                            }}>
                                                <Clock size={14} /> {formatTime(lastMsg?.createdAt)}
                                            </div>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'all 0.2s' }}>
                                                <ChevronRight size={20} />
                                            </div>
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
