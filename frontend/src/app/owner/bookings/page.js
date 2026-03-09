'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { venuesAPI, bookingsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ClipboardList, CalendarDays, User } from 'lucide-react';
import styles from './ownerBookings.module.css';

export default function OwnerBookingsPage() {
    const router = useRouter();
    const { isAuthenticated, isOwner, loading: authLoading } = useAuth();
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isOwner)) { router.push('/login'); return; }
        if (isOwner) loadVenues();
    }, [isAuthenticated, isOwner, authLoading]);

    useEffect(() => {
        if (selectedVenue) loadBookings();
    }, [selectedVenue, filter]);

    const loadVenues = async () => {
        try {
            const { data } = await venuesAPI.getMyVenues();
            const v = data.data.venues;
            setVenues(v);
            if (v.length > 0) setSelectedVenue(v[0].id);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadBookings = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter) params.status = filter;
            const { data } = await bookingsAPI.getVenueBookings(selectedVenue, params);
            setBookings(data.data.bookings);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const statusMap = {
        PENDING_DEPOSIT: { label: 'Chờ cọc', class: 'badge-warning' },
        CONFIRMED: { label: 'Đã xác nhận', class: 'badge-success' },
        COMPLETED: { label: 'Hoàn thành', class: 'badge-neutral' },
        CANCELLED: { label: 'Đã hủy', class: 'badge-danger' },
        EXPIRED: { label: 'Hết hạn', class: 'badge-neutral' },
    };

    // Group bookings by date
    const groupedBookings = bookings.reduce((acc, b) => {
        const date = new Date(b.bookingDate).toLocaleDateString('vi-VN');
        if (!acc[date]) acc[date] = [];
        acc[date].push(b);
        return acc;
    }, {});

    return (
        <div className={styles.page}>
            <div className="container">
                <h1 className="heading-lg">Lịch đặt sân</h1>

                {/* Venue selector */}
                <div className={styles.controls}>
                    <select
                        className="form-input form-select"
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        style={{ maxWidth: 300 }}
                    >
                        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>

                    <div className={styles.filterTabs}>
                        {['', 'PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                            <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                                {s === '' ? 'Tất cả' : statusMap[s]?.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary stats */}
                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <strong>{bookings.length}</strong>
                        <span>Tổng đặt sân</span>
                    </div>
                    <div className={styles.statCard}>
                        <strong>{bookings.filter(b => b.status === 'CONFIRMED').length}</strong>
                        <span>Đã xác nhận</span>
                    </div>
                    <div className={styles.statCard}>
                        <strong>
                            {bookings.reduce((sum, b) => sum + (b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? Number(b.totalPrice) : 0), 0).toLocaleString('vi-VN')}đ
                        </strong>
                        <span>Doanh thu</span>
                    </div>
                </div>

                {/* Bookings */}
                {loading ? (
                    <div>{[1, 2, 3].map(i => <div key={i} className={styles.skeletonRow}><div className="skeleton" style={{ height: 16, width: '30%', marginBottom: 6 }} /><div className="skeleton" style={{ height: 14, width: '50%' }} /></div>)}</div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ opacity: 0.5, marginBottom: 12 }}><ClipboardList size={40} /></div>
                        <div className="empty-state-title">Chưa có đặt sân nào</div>
                    </div>
                ) : (
                    Object.entries(groupedBookings).map(([date, items]) => (
                        <div key={date} className={styles.dateGroup}>
                            <h3 className={styles.dateLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={18} /> {date}</h3>
                            <div className={styles.bookingList}>
                                {items.map((booking) => (
                                    <div key={booking.id} className={styles.bookingRow}>
                                        <div className={styles.timeCol}>
                                            <strong>{booking.startTime}</strong>
                                            <span> - {booking.endTime}</span>
                                        </div>
                                        <div className={styles.infoCol}>
                                            <div className={styles.fieldName}>{booking.field?.name}</div>
                                            <div className={styles.customerName} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <User size={14} /> {booking.customer?.fullName} • {booking.customer?.phone || booking.customer?.email}
                                            </div>
                                        </div>
                                        <div className={styles.priceCol}>
                                            {Number(booking.totalPrice).toLocaleString('vi-VN')}đ
                                        </div>
                                        <span className={`badge ${statusMap[booking.status]?.class}`}>
                                            {statusMap[booking.status]?.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
