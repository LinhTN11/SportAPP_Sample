'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { venuesAPI } from '@/lib/api';
import { Search, MapPin, Star, Heart, ChevronLeft, ChevronRight, Car, Wifi, Lock, UtensilsCrossed } from 'lucide-react';
import styles from './venues.module.css';
import PageFooter from '../../components/PageFooter';
import AdvancedFilter from '../../components/Advan/Advancedfilter';
import { haversineDistance, useNearby } from '../../components/useNearby';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        city: '',
        sportType: '',
    });
    const [activeSport, setActiveSport] = useState('football');
    const [advFilters, setAdvFilters] = useState({});
    
    const { userLocation, toggle } = useNearby();

    const displayedVenues = venues
        .map(v => {
            const vLat = parseFloat(v.latitude);
            const vLng = parseFloat(v.longitude);
            const distance = (userLocation && !isNaN(vLat) && !isNaN(vLng))
                ? haversineDistance(userLocation.lat, userLocation.lng, vLat, vLng)
                : null;
            return { ...v, distance };
        })
        .filter(v => {
            if (advFilters.distance && userLocation) {
                if (v.distance === null) return false;
                if (advFilters.distance === '2'  && v.distance > 2)  return false;
                if (advFilters.distance === '5'  && (v.distance <= 2 || v.distance > 5))  return false;
                if (advFilters.distance === '10' && (v.distance <= 5 || v.distance > 10)) return false;
                if (advFilters.distance === '99' && v.distance <= 10) return false;
            }
            return true;
        });
    const SportIcons = 
    {
    all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>,
    football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6l3 4-1 4H10l-1-4z"/><path d="M12 6V2"/><path d="M15 10l5-2"/><path d="M14 14l3 5"/><path d="M10 14l-3 5"/><path d="M9 10L4 8"/></svg>,
    badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4"/><path d="M10 22h4"/><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z"/><path d="M9 6v2"/><path d="M12 6v2"/><path d="M15 6v2"/></svg>,
    tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/></svg>,
    basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 C 8 2, 6 5, 6 10 L 6 14 C 6 16.2, 8 18, 10 18 L 14 18 C 16 18, 18 16.2, 18 14 L 18 10 C 18 5, 16 2, 12 2 Z"/><path d="M12 18 L 12 22"/><path d="M10 20 L 14 20"/><circle cx="19" cy="19" r="4.5"/><circle cx="19" cy="19" r="0.8"/><circle cx="16" cy="19" r="0.8"/><circle cx="22" cy="19" r="0.8"/><circle cx="19" cy="16" r="0.8"/><circle cx="19" cy="22" r="0.8"/><circle cx="17" cy="17" r="0.8"/><circle cx="21" cy="21" r="0.8"/></svg>
};
    const sportTypes = [
        { value: '', label: 'Tất cả môn', icon: SportIcons.all },
        { value: 'football', label: 'Bóng đá', icon: SportIcons.football },
        { value: 'badminton', label: 'Cầu lông', icon: SportIcons.badminton },
        { value: 'tennis', label: 'Tennis', icon: SportIcons.tennis },
        { value: 'basketball', label: 'Bóng rổ', icon: SportIcons.basketball },
        { value: 'pickleball', label: 'Pickleball', icon: SportIcons.pickleball },
    ];

    const quickFilters = [
        { label: 'Giá tốt nhất', checked: false },
        { label: 'Gần tôi nhất', checked: false },
        { label: 'Đánh giá cao', checked: false },
        { label: 'Ưu đãi hôm nay', checked: false },
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

    const getSportIcon = (sportType) => {
        const sport = sportTypes.find(s => s.value === sportType);
        return sport?.icon || SportIcons.all;
    };

    const getSportLabel = (sportType) => {
        const sport = sportTypes.find(s => s.value === sportType);
        return sport?.label || sportType;
    };
    const getSportLabel1 = (sportType) => {
        const sport = sportTypes.find(s => s.value === sportType);
        return sport?.value || sportType;
    };

    const getSportTagClass = (sportType) => {
        const classes = {'badminton': styles.tagYellow,'tennis': styles.tagYellow,'football': styles.tagBlue,'basketball': styles.tagRed,'swimming': styles.tagCyan,};
        return classes[sportType] || styles.tagGray;
    };

    return (
        <div className={styles.page}>
            {/* Hero Section */}
            <div className={styles.hero}>
                <h1 className={styles.heroTitle}>Tìm sân thể thao gần bạn</h1>
                <p className={styles.heroSubtitle}>
                    Khám phá và đặt sân dễ dàng từ hơn 1000+ địa điểm trên toàn quốc
                </p>
                {/* Search Bar */}
                <div className={styles.searchBar}>
                    <div className={styles.searchSport}>
                        <span className={styles.searchIcon}>
                            {getSportIcon(filters.sportType)}
                        </span>
                        <select
                            value={filters.sportType}
                            onChange={(e) => setFilters({ ...filters, sportType: e.target.value })}
                        >
                            {sportTypes.map((st) => (
                                <option key={st.value} value={st.value}>
                                    {st.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.searchDivider} />
                    <div className={styles.searchLocation}>
                        <MapPin size={20} />
                        <input
                            type="text"
                            placeholder="Tìm theo thành phố, quận..."
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        />
                    </div>
                    <button className={styles.searchButton}>
                        Tìm kiếm
                    </button>
                </div>
            </div>

            <div className={styles.container}>
                {/* Sport Filter Tabs */}
                <div className={styles.sportFilters}>
                    {sportTypes.slice(1).map((st) => (
                        <button
                            key={st.value}
                            className={`${styles.sportTab} ${activeSport === st.value ? styles.sportTabActive : ''}`}
                            onClick={() => {
                                setActiveSport(st.value);
                                setFilters({ ...filters, sportType: st.value });
                            }}
                        >
                            <span className={styles.sportTabIcon}>{st.icon}</span>
                            {st.label}
                        </button>
                    ))}
                </div>

                {/* Quick Filters */}
                <div className={styles.quickFilters}>
                    {quickFilters.map((filter, idx) => (
                        <label key={idx} className={styles.quickFilter}>
                            <input type="checkbox" defaultChecked={filter.checked} />
                            <span>{filter.label}</span>
                        </label>
                    ))}
                </div>
                {/* Layout: Sidebar bộ lọc + nội dung */}
                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                    <AdvancedFilter
                        onApply={(f) => {
                            setAdvFilters(f);
                            if (f.distance && !userLocation) {
                                toggle(true);
                            }
                        }}
                        onClear={() => { setAdvFilters({}); }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>

                {/* Results Bar */}
                <div className={styles.resultsBar}>
                    <div className={styles.resultsCount}>
                        Tìm thấy <strong>{displayedVenues.length}</strong> sân phù hợp
                    </div>
                    <div className={styles.resultsSort}>
                        <span>Sắp xếp:</span>
                        <select>
                            <option>Phù hợp nhất</option>
                            <option>Giá thấp đến cao</option>
                            <option>Giá cao đến thấp</option>
                            <option>Đánh giá cao nhất</option>
                        </select>
                    </div>
                </div>

                {/* Venue Grid */}
                {loading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className={styles.skeletonCard}>
                                <div className={styles.skeletonImage} />
                                <div className={styles.skeletonBody}>
                                    <div className={styles.skeletonLine} style={{ width: '70%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '50%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '40%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : displayedVenues.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>{SportIcons.all}</div>
                        <h3 className={styles.emptyTitle}>Chưa có sân nào</h3>
                        <p className={styles.emptyText}>Thử thay đổi bộ lọc hoặc tìm ở khu vực khác</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {displayedVenues.map((venue) => (
                            <Link key={venue.id} href={`/venues/${venue.id}`} className={styles.venueCard}>
                                {/* Image */}
                                <div className={styles.venueImage}>
                                    {venue.images?.length > 0 ? (
                                        <img src={`${SERVER_URL}${venue.images[0]}`} alt={venue.name} />
                                    ) : (
                                        <div className={styles.venuePlaceholder}>
                                            {getSportIcon(venue.sportTypes?.[0])}
                                        </div>
                                    )}
                                    <div className={styles.statusBadge}>Đang hoạt động</div>
                                    <button className={styles.heartButton}>
                                        <Heart size={20} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className={styles.venueBody}>
                                    <h3 className={styles.venueName}>{venue.name}</h3>

                                    {/* Rating */}
                                    <div className={styles.venueRating}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star key={star} size={16} fill="#FFC107" color="#FFC107" />
                                        ))}
                                        <span className={styles.ratingValue}>
                                            {venue.avgRating?.toFixed(1) || '5'}
                                        </span>
                                        <span className={styles.reviewCount}>
                                            ({venue.reviewCount || 0})
                                        </span>
                                    </div>

                                    {/* Sport Type & Fields */}
                                    <div className={styles.venueInfo}>
                                        <span>{getSportLabel(venue.sportTypes?.[0])}</span>
                                        <span className={styles.infoDivider}>|</span>
                                        <span>{venue.fields?.length || 0} sân khả dụng</span>
                                    </div>

                                    {/* Location */}
                                    <div className={styles.venueLocation}>
                                        <MapPin size={14} />
                                        <span>{venue.address}, {venue.district}, {venue.city}</span>
                                        {venue.distance !== null && (
                                            <span className={styles.distanceBadge}>
                                                {venue.distance < 1
                                                    ? `${Math.round(venue.distance * 1000)}m`
                                                    : `${venue.distance.toFixed(1)}km`}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.venueAmenities}>
                                        <Car size={20} />
                                        <Wifi size={20} />
                                        <Lock size={20} />
                                        <UtensilsCrossed size={20} />
                                    </div>
                                    <div className={styles.sportTags}>
                                        <span className={getSportTagClass(venue.sportTypes?.[0])}>
                                            {getSportLabel1(venue.sportTypes?.[0])}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {!loading && displayedVenues.length > 0 && (
                    <div className={styles.pagination}>
                        <button className={styles.pageArrow}><ChevronLeft size={20} /></button>
                        <button className={styles.pageNum}>1</button>
                        <button className={`${styles.pageNum} ${styles.pageActive}`}>2</button>
                        <button className={styles.pageNum}>3</button>
                        <button className={styles.pageNum}>4</button>
                        <button className={styles.pageArrow}><ChevronRight size={20} /></button>
                    </div>
                    
                )}
                <div className={styles.pageInfo}>Hiển thị 1-9 của {displayedVenues.length} sân</div>
                    </div></div>
                <div className={styles.promoBanner}>
                    <div className={styles.promoIcon}>{SportIcons.football}</div>
                    <div className={styles.promoContent}>
                        <h3>Giảm đến 30% cho lần đặt đầu tiên</h3>
                        <p>Đăng ký ngay để nhận ưu đãi đặt sân hấp dẫn</p>
                    </div>
                    <button className={styles.promoButton}>Đăng ký ngay</button>
                </div>
            </div>
            <PageFooter />
        </div>
    );
}
