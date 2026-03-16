'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { venuesAPI, bookingsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ClipboardList, CalendarDays, User, ChevronDown } from 'lucide-react';
import styles from './ownerBookings.module.css';

export default function OwnerBookingsPage() {
    const router = useRouter();
    const { isAuthenticated, isOwner, loading: authLoading } = useAuth();
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState('');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    
    // Custom Dropdown State
    const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
    const venueDropdownRef = useRef(null);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (venueDropdownRef.current && !venueDropdownRef.current.contains(e.target)) {
                setVenueDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    <div className={styles.customDropdown} ref={venueDropdownRef}>
                        <div 
                            className={`${styles.dropdownTrigger} ${venueDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                            onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
                        >
                            <span>{venues.find(v => v.id === selectedVenue)?.name || 'Vui lòng chọn sân...'}</span>
                            <span className={`${styles.dropdownChevron} ${venueDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                <ChevronDown size={16} />
                            </span>
                        </div>
                        
                        {venueDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                {venues.map(v => (
                                    <div 
                                        key={v.id} 
                                        className={`${styles.dropdownOption} ${selectedVenue === v.id ? styles.dropdownOptionActive : ''}`}
                                        onClick={() => {
                                            setSelectedVenue(v.id);
                                            setVenueDropdownOpen(false);
                                        }}
                                    >
                                        {v.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                        <div className="empty-state-icon">
                            <ClipboardList size={48} strokeWidth={1.5} color="var(--text-tertiary)" />
                        </div>
                        <div className="empty-state-title">Chưa có đặt sân nào</div>
                        <div className="empty-state-text">Khi có khách đặt sân, thông tin sẽ hiển thị tại đây.</div>
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
