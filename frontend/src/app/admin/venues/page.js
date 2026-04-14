/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { venuesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
    MapPin, Clock, User, Phone, ChevronDown, CheckCircle2,
    XCircle, Shield, Calendar, Image as ImageIcon, Building2,
    FileText,
} from 'lucide-react';
import { getSportIcon, getSportLabel } from '@/components/venue/SportIcons';
import StatusBadge from '@/components/ui/StatusBadge';
import styles from './admin.module.css';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminVenuesPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const [venues, setVenues] = useState([]);
    const [allVenues, setAllVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('PENDING');
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);

    // Reject modal
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
            router.push('/login');
            return;
        }
        if (user?.role === 'ADMIN') loadVenues();
    }, [isAuthenticated, user, authLoading]);

    const loadVenues = async () => {
        try {
            // Load venues by status separately (backend doesn't support status=ALL)
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
                venuesAPI.getPending(),
                venuesAPI.list({ status: 'APPROVED', limit: 100 }).catch(() => ({ data: { data: { venues: [] } } })),
                venuesAPI.list({ status: 'REJECTED', limit: 100 }).catch(() => ({ data: { data: { venues: [] } } })),
            ]);

            const pending = (pendingRes.data.data.venues || []).map(v => ({ ...v, status: v.status || 'PENDING' }));
            const approved = approvedRes.data.data.venues || [];
            const rejected = rejectedRes.data.data.venues || [];

            const merged = [...pending, ...approved, ...rejected];
            setAllVenues(merged);
            setVenues(merged);
        } catch (err) {
            console.error('Failed to load venues:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter venues
    const filteredVenues = filter === 'ALL'
        ? allVenues
        : allVenues.filter(v => v.status === filter);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleApprove = async (venueId) => {
        setActionLoading(venueId);
        try {
            await venuesAPI.approve(venueId);
            showToast('Đã duyệt sân thành công! ✅');
            loadVenues();
            setExpandedId(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Duyệt sân thất bại', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setActionLoading(rejectModal);
        try {
            await venuesAPI.reject(rejectModal, rejectReason);
            showToast('Đã từ chối sân');
            setRejectModal(null);
            setRejectReason('');
            loadVenues();
            setExpandedId(null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Từ chối thất bại', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const statusCounts = {
        ALL: allVenues.length,
        PENDING: allVenues.filter(v => v.status === 'PENDING').length,
        APPROVED: allVenues.filter(v => v.status === 'APPROVED').length,
        REJECTED: allVenues.filter(v => v.status === 'REJECTED').length,
    };

    return (
        <div className={styles.page}>
            <div className="container">
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Duyệt sân</h1>
                        <p className={styles.pageSubtitle}>Xét duyệt và quản lý các khu sân đăng ký mới</p>
                    </div>
                </div>

                {/* Summary Bar */}
                {!loading && (
                    <div className={styles.summaryBar}>
                        <div className={styles.summaryItem}>
                            <Shield size={16} color="#6B7280" />
                            <strong>{statusCounts.ALL}</strong> tổng sân
                        </div>
                        <div className={styles.summaryItem}>
                            <Clock size={16} color="#F59E0B" />
                            <strong>{statusCounts.PENDING}</strong> chờ duyệt
                        </div>
                        <div className={styles.summaryItem}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <strong>{statusCounts.APPROVED}</strong> đã duyệt
                        </div>
                        <div className={styles.summaryItem}>
                            <XCircle size={16} color="#EF4444" />
                            <strong>{statusCounts.REJECTED}</strong> từ chối
                        </div>
                    </div>
                )}

                {/* Filter tabs */}
                <div className={styles.filterTabs}>
                    {[
                        { key: 'PENDING', label: `Chờ duyệt (${statusCounts.PENDING})` },
                        { key: 'APPROVED', label: `Đã duyệt (${statusCounts.APPROVED})` },
                        { key: 'REJECTED', label: `Từ chối (${statusCounts.REJECTED})` },
                        { key: 'ALL', label: 'Tất cả' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ''}`}
                            onClick={() => setFilter(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Venue list */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
                        <span className="spinner spinner-lg" />
                    </div>
                ) : filteredVenues.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            {filter === 'PENDING' ? '📋' : filter === 'APPROVED' ? '✅' : filter === 'REJECTED' ? '❌' : '🏟️'}
                        </div>
                        <div className="empty-state-title">
                            {filter === 'PENDING' ? 'Không có sân chờ duyệt' : `Không có sân ${filter === 'APPROVED' ? 'đã duyệt' : filter === 'REJECTED' ? 'bị từ chối' : ''}`}
                        </div>
                        <div className="empty-state-text">
                            {filter === 'PENDING' ? 'Tất cả các sân đã được xử lý' : 'Chưa có sân nào ở trạng thái này'}
                        </div>
                    </div>
                ) : (
                    <div className={styles.venueList}>
                        {filteredVenues.map(venue => (
                            <div key={venue.id} className={styles.venueItem}>
                                {/* Main row — clickable */}
                                <div
                                    className={styles.venueItemMain}
                                    onClick={() => setExpandedId(expandedId === venue.id ? null : venue.id)}
                                >
                                    {/* Thumbnail */}
                                    <div className={styles.venueThumb}>
                                        {venue.images?.length > 0 ? (
                                            <img src={`${SERVER_URL}${venue.images[0]}`} alt={venue.name} />
                                        ) : (
                                            <div className={styles.thumbPlaceholder}>
                                                <span>{getSportIcon(venue.sportTypes?.[0])}</span>
                                                <span>Chưa có ảnh</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className={styles.venueInfo}>
                                        <div className={styles.venueNameRow}>
                                            <span className={styles.venueName}>{venue.name}</span>
                                            <span className={styles.venueStatusBadge}>
                                                <StatusBadge status={venue.status} />
                                            </span>
                                        </div>

                                        <div className={styles.venueMeta}>
                                            <span className={styles.metaItem}>
                                                <MapPin size={14} /> {[venue.address, venue.district, venue.city].filter(Boolean).join(', ')}
                                            </span>
                                            {venue.openTime && (
                                                <span className={styles.metaItem}>
                                                    <Clock size={14} /> {venue.openTime} – {venue.closeTime}
                                                </span>
                                            )}
                                            {venue.phone && (
                                                <span className={styles.metaItem}>
                                                    <Phone size={14} /> {venue.phone}
                                                </span>
                                            )}
                                        </div>

                                        {venue.description && (
                                            <p className={styles.venueDesc}>{venue.description}</p>
                                        )}

                                        {venue.sportTypes?.length > 0 && (
                                            <div className={styles.venueSportTags}>
                                                {venue.sportTypes.map(st => (
                                                    <span key={st} className="sport-tag">
                                                        {getSportIcon(st)} {getSportLabel(st)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Owner + expand */}
                                    <div className={styles.ownerSection}>
                                        {venue.owner && (
                                            <div className={styles.ownerInfo}>
                                                <div className={styles.ownerAvatar}>
                                                    {venue.owner.avatarUrl
                                                        ? <img src={venue.owner.avatarUrl} alt="" />
                                                        : venue.owner.fullName?.charAt(0) || 'O'
                                                    }
                                                </div>
                                                <div>
                                                    <div className={styles.ownerName}>{venue.owner.fullName}</div>
                                                    {venue.owner.phone && (
                                                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{venue.owner.phone}</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className={styles.submittedDate}>
                                            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                                            {formatDate(venue.createdAt)}
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={`${styles.chevron} ${expandedId === venue.id ? styles.chevronOpen : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Expanded detail panel */}
                                {expandedId === venue.id && (
                                    <div className={styles.detailPanel}>
                                        <div className={styles.detailGrid}>
                                            {/* Venue details */}
                                            <div className={styles.detailSection}>
                                                <div className={styles.detailSectionTitle}>
                                                    <Building2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Thông tin sân
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Tên sân</span>
                                                    <span className={styles.detailValue}>{venue.name}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Địa chỉ</span>
                                                    <span className={styles.detailValue}>{venue.address}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Quận/Huyện</span>
                                                    <span className={styles.detailValue}>{venue.district || '—'}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Thành phố</span>
                                                    <span className={styles.detailValue}>{venue.city}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>Giờ hoạt động</span>
                                                    <span className={styles.detailValue}>
                                                        {venue.openTime || '—'} – {venue.closeTime || '—'}
                                                    </span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <span className={styles.detailLabel}>SĐT</span>
                                                    <span className={styles.detailValue}>{venue.phone || '—'}</span>
                                                </div>
                                                {venue.latitude && (
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>Tọa độ</span>
                                                        <span className={styles.detailValue}>
                                                            {Number(venue.latitude).toFixed(6)}, {Number(venue.longitude).toFixed(6)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Owner & dates */}
                                            <div className={styles.detailSection}>
                                                <div className={styles.detailSectionTitle}>
                                                    <User size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Chủ sân
                                                </div>
                                                {venue.owner && (
                                                    <>
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailLabel}>Họ tên</span>
                                                            <span className={styles.detailValue}>{venue.owner.fullName}</span>
                                                        </div>
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailLabel}>Email</span>
                                                            <span className={styles.detailValue}>{venue.owner.email || '—'}</span>
                                                        </div>
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailLabel}>SĐT</span>
                                                            <span className={styles.detailValue}>{venue.owner.phone || '—'}</span>
                                                        </div>
                                                    </>
                                                )}
                                                <div style={{ marginTop: 12 }}>
                                                    <div className={styles.detailSectionTitle}>
                                                        <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                        Mô tả
                                                    </div>
                                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                        {venue.description || 'Không có mô tả'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Images */}
                                        {venue.images?.length > 0 && (
                                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                                <div className={styles.detailSectionTitle} style={{ marginBottom: 8 }}>
                                                    <ImageIcon size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Hình ảnh ({venue.images.length})
                                                </div>
                                                <div className={styles.imageGallery}>
                                                    {venue.images.map((img, idx) => (
                                                        <div key={idx} className={styles.galleryImage}>
                                                            <img src={`${SERVER_URL}${img}`} alt={`${venue.name} ${idx + 1}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action bar — only for PENDING */}
                                        {venue.status === 'PENDING' && (
                                            <div className={styles.actionBar}>
                                                <button
                                                    className={styles.btnReject}
                                                    onClick={() => { setRejectModal(venue.id); setRejectReason(''); }}
                                                    disabled={actionLoading === venue.id}
                                                >
                                                    <XCircle size={16} />
                                                    Từ chối
                                                </button>
                                                <button
                                                    className={styles.btnApprove}
                                                    onClick={() => handleApprove(venue.id)}
                                                    disabled={actionLoading === venue.id}
                                                >
                                                    {actionLoading === venue.id
                                                        ? <span className="spinner" style={{ width: 18, height: 18 }} />
                                                        : <><CheckCircle2 size={16} /> Duyệt sân</>
                                                    }
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ===== REJECT MODAL ===== */}
                {rejectModal && (
                    <div className="modal-overlay" onClick={() => setRejectModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className="modal-header">
                                <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <XCircle size={20} color="var(--danger)" /> Từ chối sân
                                </h2>
                                <button className="modal-close" onClick={() => setRejectModal(null)}>×</button>
                            </div>

                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                                Vui lòng nhập lý do từ chối để chủ sân có thể chỉnh sửa và nộp lại.
                            </p>

                            <div className="form-group">
                                <label className="form-label">Lý do từ chối *</label>
                                <textarea
                                    className={styles.rejectTextarea}
                                    placeholder="Ví dụ: Thiếu hình ảnh, địa chỉ không rõ ràng..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={() => setRejectModal(null)}
                                >
                                    Huỷ
                                </button>
                                <button
                                    className="btn btn-danger"
                                    style={{ flex: 2 }}
                                    onClick={handleReject}
                                    disabled={!rejectReason.trim() || actionLoading === rejectModal}
                                >
                                    {actionLoading === rejectModal
                                        ? <span className="spinner" style={{ width: 18, height: 18 }} />
                                        : 'Xác nhận từ chối'
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                        {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
}
