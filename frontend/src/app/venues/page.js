'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { venuesAPI } from '@/lib/api';
import styles from './venues.module.css';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        city: '',
        sportType: '',
    });

    const sportTypes = [
        { value: '', label: 'Tất cả môn' },
        { value: 'football', label: '⚽ Bóng đá' },
        { value: 'badminton', label: '🏸 Cầu lông' },
        { value: 'tennis', label: '🎾 Tennis' },
        { value: 'basketball', label: '🏀 Bóng rổ' },
        { value: 'volleyball', label: '🏐 Bóng chuyền' },
        { value: 'pickleball', label: '🏓 Pickleball' },
        { value: 'table_tennis', label: '🏓 Bóng bàn' },
    ];

    useEffect(() => {
        loadVenues();
    }, [filters]);

    const loadVenues = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.city) params.city = filters.city;
            if (filters.sportType) params.sportType = filters.sportType;

            const { data } = await venuesAPI.list(params);
            setVenues(data.data.venues);
        } catch (err) {
            console.error('Failed to load venues:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className="container">
                {/* Header */}
                <div className={styles.header}>
                    <h1 className="heading-lg">Tìm sân thể thao</h1>
                    <p className={styles.subtitle}>Khám phá và đặt sân gần bạn</p>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.filterGroup}>
                        <select
                            className="form-input form-select"
                            value={filters.sportType}
                            onChange={(e) => setFilters({ ...filters, sportType: e.target.value })}
                        >
                            {sportTypes.map((st) => (
                                <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Tìm theo thành phố..."
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        />
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className={styles.loadingGrid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className={styles.skeleton}>
                                <div className={`${styles.skeletonImg} skeleton`} />
                                <div className={styles.skeletonBody}>
                                    <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
                                    <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : venues.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏟️</div>
                        <div className="empty-state-title">Chưa có sân nào</div>
                        <div className="empty-state-text">
                            Thử thay đổi bộ lọc hoặc tìm ở khu vực khác
                        </div>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {venues.map((venue) => (
                            <Link key={venue.id} href={`/venues/${venue.id}`} className={styles.venueCard}>
                                <div className={styles.venueImage}>
                                    {venue.images?.length > 0 ? (
                                        <img src={`${SERVER_URL}${venue.images[0]}`} alt={venue.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div className={styles.venuePlaceholder}>
                                            {venue.sportTypes?.[0] === 'football' ? '⚽' :
                                                venue.sportTypes?.[0] === 'badminton' ? '🏸' :
                                                    venue.sportTypes?.[0] === 'tennis' ? '🎾' : '🏟️'}
                                        </div>
                                    )}
                                    <div className={styles.venueStatus}>
                                        <span className="badge badge-success">Đang hoạt động</span>
                                    </div>
                                </div>
                                <div className={styles.venueBody}>
                                    <h3 className={styles.venueName}>{venue.name}</h3>
                                    <p className={styles.venueAddress}>📍 {venue.address}, {venue.district}, {venue.city}</p>

                                    <div className={styles.venueMeta}>
                                        <div className={styles.venueRating}>
                                            <span className="stars">★</span>
                                            <span>{venue.avgRating?.toFixed(1) || '—'}</span>
                                            <span className={styles.reviewCount}>({venue.reviewCount || 0})</span>
                                        </div>
                                        <div className={styles.fieldCount}>
                                            {venue.fields?.length || 0} sân
                                        </div>
                                    </div>

                                    <div className={styles.sportTags}>
                                        {(venue.sportTypes || []).map((st) => (
                                            <span key={st} className="badge badge-primary">{st}</span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
