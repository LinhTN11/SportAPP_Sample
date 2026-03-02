'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { venuesAPI } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import styles from './admin.module.css';

export default function AdminVenuesPage() {
    const router = useRouter();
    const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
    const [pendingVenues, setPendingVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState({ open: false, venueId: null, reason: '' });

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/login');
            return;
        }
        if (isAdmin) loadPending();
    }, [isAuthenticated, isAdmin, authLoading]);

    const loadPending = async () => {
        try {
            const { data } = await venuesAPI.getPending();
            setPendingVenues(data.data.venues);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleApprove = async (id) => {
        try {
            await venuesAPI.approve(id);
            loadPending();
        } catch (err) {
            alert(err.response?.data?.message || 'Duyệt thất bại');
        }
    };

    const openRejectModal = (venueId) => {
        setRejectModal({ open: true, venueId, reason: '' });
    };

    const handleRejectSubmit = async () => {
        try {
            await venuesAPI.reject(rejectModal.venueId, rejectModal.reason);
            setRejectModal({ open: false, venueId: null, reason: '' });
            loadPending();
        } catch (err) {
            alert(err.response?.data?.message || 'Từ chối thất bại');
        }
    };

    return (
        <div className={styles.page}>
            <div className="container">
                <h1 className="heading-lg">Duyệt sân ⏳</h1>
                <p className="caption" style={{ marginBottom: 24 }}>
                    {pendingVenues.length} sân đang chờ duyệt
                </p>

                {loading ? (
                    <div className={styles.list}>{[1, 2].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div>)}</div>
                ) : pendingVenues.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">✅</div>
                        <div className="empty-state-title">Không có sân chờ duyệt</div>
                        <div className="empty-state-text">Tất cả sân đã được xử lý</div>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {pendingVenues.map((venue) => (
                            <div key={venue.id} className={styles.venueCard}>
                                <div className={styles.venueInfo}>
                                    <h3>{venue.name}</h3>
                                    <p className={styles.addr}>📍 {venue.address}, {venue.district}, {venue.city}</p>
                                    {venue.description && <p className={styles.desc}>{venue.description}</p>}
                                    <div className={styles.owner}>
                                        <Avatar user={venue.owner} size="sm" />
                                        <div>
                                            <strong className="body-sm">{venue.owner?.fullName}</strong>
                                            <span className="caption"> • {venue.owner?.email} • {venue.owner?.phone}</span>
                                        </div>
                                    </div>
                                    <span className="caption">Đăng ký: {new Date(venue.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className={styles.actions}>
                                    <button className="btn btn-primary" onClick={() => handleApprove(venue.id)}>
                                        ✅ Duyệt
                                    </button>
                                    <button className="btn btn-danger" onClick={() => openRejectModal(venue.id)}>
                                        ❌ Từ chối
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject reason modal */}
            {rejectModal.open && (
                <div className="modal-overlay" onClick={() => setRejectModal({ open: false, venueId: null, reason: '' })}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="heading-sm">Lý do từ chối</h3>
                            <button className="modal-close" onClick={() => setRejectModal({ open: false, venueId: null, reason: '' })}>×</button>
                        </div>
                        <div className="form-group">
                            <textarea
                                className="form-input"
                                placeholder="Nhập lý do từ chối sân..."
                                rows={3}
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setRejectModal({ open: false, venueId: null, reason: '' })}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleRejectSubmit}>Xác nhận từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
