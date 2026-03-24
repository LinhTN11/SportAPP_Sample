'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { venuesAPI } from '@/lib/api';
import { Search, MapPin, Star, Heart, ChevronLeft, ChevronRight, Car, Wifi, Lock, UtensilsCrossed, ChevronDown } from 'lucide-react';
import styles from './venues.module.css';
import PageFooter from '../../components/PageFooter';
import AdvancedFilter from '../../components/Advan/Advancedfilter';
import { haversineDistance, useNearby } from '../../components/useNearby';
import { getSportColorClass, getSportLabel, getSportTagClass } from '@/components/venue/SportIcons';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const ITEMS_PER_PAGE = 9;

export default function VenuesPage() {
    const searchParams = useSearchParams();
    const urlSportType = searchParams.get('sportType') || '';
    const urlCity = searchParams.get('city') || '';

    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        address: '',
        sportType: '',
    });
    const [activeSport, setActiveSport] = useState(urlSportType || 'football');
    const [advFilters, setAdvFilters] = useState({});
    const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [sortValue, setSortValue] = useState('Phù hợp nhất');
    
    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);

    const sportDropdownRef = useRef(null);
    const sortDropdownRef = useRef(null);
    const { userLocation, toggle } = useNearby();

    const getMinPrice = (venue) => {
        const prices = venue.fields?.flatMap(f => f.pricingRules?.map(r => r.pricePerHour) || []) || [];
        return prices.length > 0 ? Math.min(...prices) : Infinity;
    };

    
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, advFilters, sortValue]);

    const displayedVenues = venues
        .map(v => {
            const vLat = parseFloat(v.latitude);
            const vLng = parseFloat(v.longitude);
            const distance = (userLocation && !isNaN(vLat) && !isNaN(vLng))
                ? haversineDistance(userLocation.lat, userLocation.lng, vLat, vLng)
                : null;
            
            let finalPrice = 0;
            if (v.minPrice !== null && v.minPrice !== undefined && v.minPrice !== '') {
                const cleanPrice = v.minPrice.toString().replace(/[^0-9]/g, '');
                finalPrice = Number(cleanPrice);
            } else {
                const calc = getMinPrice(v);
                finalPrice = calc === Infinity ? 0 : calc;
            }

            return { ...v, distance, finalPrice };
        })
        .filter(v => {
            if (advFilters.distance && userLocation) {
                if (v.distance === null) return false;
                if (advFilters.distance === '2' && v.distance > 2) return false;
                if (advFilters.distance === '5' && (v.distance <= 2 || v.distance > 5)) return false;
                if (advFilters.distance === '10' && (v.distance <= 5 || v.distance > 10)) return false;
                if (advFilters.distance === '99' && v.distance <= 10) return false;
            }
            if (filters.address) {
                const kw = filters.address.toLowerCase();
                const match =
                    v.address?.toLowerCase().includes(kw) ||
                    v.district?.toLowerCase().includes(kw) ||
                    v.city?.toLowerCase().includes(kw) ||
                    v.name?.toLowerCase().includes(kw);
                if (!match) return false;
            }
            return true;
        })
        .sort((a, b) => {
            const priceA = parseInt(a.finalPrice, 10) || 0;
            const priceB = parseInt(b.finalPrice, 10) || 0;

            if (sortValue === 'Giá thấp đến cao') {
                if (priceA === 0 && priceB !== 0) return 1;
                if (priceB === 0 && priceA !== 0) return -1;   
                if (priceA < priceB) return -1;
                if (priceA > priceB) return 1;
                return 0;
            }
            if (sortValue === 'Giá cao đến thấp') {
                if (priceA === 0 && priceB !== 0) return 1;
                if (priceB === 0 && priceA !== 0) return -1;
                if (priceA > priceB) return -1;
                if (priceA < priceB) return 1;
                return 0;
            }
            if (sortValue === 'Đánh giá cao nhất') {
                const rateA = parseFloat(a.avgRating) || 0;
                const rateB = parseFloat(b.avgRating) || 0;
                if (rateA > rateB) return -1;
                if (rateA < rateB) return 1;
                return 0;
            }
            return 0;
        });

    // === LOGIC PHÂN TRANG ===
    const totalPages = Math.ceil(displayedVenues.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    // Cắt ra đúng 12 sân cho trang hiện tại
    const currentVenues = displayedVenues.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const SportIcons = {
        all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>,
        football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6l3 4-1 4H10l-1-4z" /><path d="M12 6V2" /><path d="M15 10l5-2" /><path d="M14 14l3 5" /><path d="M10 14l-3 5" /><path d="M9 10L4 8" /></svg>,
        badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4" /><path d="M10 22h4" /><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z" /><path d="M9 6v2" /><path d="M12 6v2" /><path d="M15 6v2" /></svg>,
        tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M6 5.3a9 9 0 0 1 0 13.4" /><path d="M18 5.3a9 9 0 0 0 0 13.4" /></svg>,
        basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2v20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
        volleyball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2C6.5 2 2 6.5 2 12" /><path d="M12 2c3 3 4 8 1 13" /><path d="M2 12c3-1 8-2 13 1" /></svg>,
        pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /><circle cx="12" cy="15" r="1" /></svg>,
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

    const quickFilters = [
        { label: 'Giá tốt nhất', checked: false },
        { label: 'Gần tôi nhất', checked: false },
        { label: 'Đánh giá cao', checked: false },
        { label: 'Ưu đãi hôm nay', checked: false },
    ];

    useEffect(() => {
        loadVenues();
    }, [filters]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sportDropdownRef.current && !sportDropdownRef.current.contains(e.target)) {
                setSportDropdownOpen(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
                setSortDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const loadVenues = async () => {
        try {
            setLoading(true);
            const params = {};
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

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <h1 className={styles.heroTitle}>Tìm sân thể thao gần bạn</h1>
                <p className={styles.heroSubtitle}>
                    Khám phá và đặt sân dễ dàng từ hơn 1000+ địa điểm trên toàn quốc
                </p>
                <div className={styles.searchBar}>
                    <div className={styles.searchSport} ref={sportDropdownRef}>
                        <div className={styles.customDropdown}>
                            <div
                                className={`${styles.dropdownTrigger} ${styles.dropdownTriggerInline} ${sportDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                onClick={() => setSportDropdownOpen(!sportDropdownOpen)}
                            >
                                <span className={styles.searchIcon}>
                                    {getSportIcon(filters.sportType)}
                                </span>
                                <span>{sportTypes.find(s => s.value === filters.sportType)?.label || 'Tất cả môn'}</span>
                                <span className={`${styles.dropdownChevron} ${sportDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                    <ChevronDown size={16} />
                                </span>
                            </div>
                            {sportDropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    {sportTypes.map((st) => (
                                        <div
                                            key={st.value}
                                            className={`${styles.dropdownOption} ${filters.sportType === st.value ? styles.dropdownOptionActive : ''}`}
                                            onClick={() => {
                                                setFilters({ ...filters, sportType: st.value });
                                                setActiveSport(st.value);
                                                setSportDropdownOpen(false);
                                            }}
                                        >
                                            <span className={styles.dropdownOptionIcon}>{st.icon}</span>
                                            {st.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.searchDivider} />
                    <div className={styles.searchLocation}>
                        <MapPin size={20} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên sân, địa chỉ, quận..."
                            value={filters.address}
                            onChange={(e) => setFilters({ ...filters, address: e.target.value })}
                        />
                    </div>
                    <button className={styles.searchButton}>
                        Tìm kiếm
                    </button>
                </div>
            </div>

            <div className={styles.container}>
                <div className={styles.sportFilters}>
                    {sportTypes.slice(1).map((st) => (
                        <button
                            key={st.value}
                            className={`${styles.sportTab} ${activeSport === st.value ? getSportColorClass(st.value) : ''}`}
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
                        <div className={styles.resultsBar}>
                            <div className={styles.resultsCount}>
                                Tìm thấy <strong>{displayedVenues.length}</strong> sân phù hợp
                            </div>
                            <div className={styles.resultsSort} ref={sortDropdownRef}>
                                <span>Sắp xếp:</span>
                                <div className={styles.customDropdown}>
                                    <div
                                        className={`${styles.dropdownTrigger} ${sortDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                                    >
                                        <span>{sortValue}</span>
                                        <span className={`${styles.dropdownChevron} ${sortDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                            <ChevronDown size={16} />
                                        </span>
                                    </div>
                                    {sortDropdownOpen && (
                                        <div className={`${styles.dropdownMenu} ${styles.dropdownMenuRight}`}>
                                            {['Phù hợp nhất', 'Giá thấp đến cao', 'Giá cao đến thấp', 'Đánh giá cao nhất'].map((opt) => (
                                                <div
                                                    key={opt}
                                                    className={`${styles.dropdownOption} ${sortValue === opt ? styles.dropdownOptionActive : ''}`}
                                                    onClick={() => {
                                                        setSortValue(opt);
                                                        setSortDropdownOpen(false);
                                                    }}
                                                >
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                                {/* SỬ DỤNG currentVenues thay vì displayedVenues ở đây */}
                                {currentVenues.map((venue) => (
                                    <Link key={venue.id} href={`/venues/${venue.id}`} className={styles.venueCard}>
                                        <div className={styles.venueImage}>
                                            {venue.images?.length > 0 ? (
                                                <img src={`${SERVER_URL}${venue.images[0]}`} alt={venue.name} />
                                            ) : (
                                                <div className={styles.venuePlaceholder}>
                                                    {getSportIcon(venue.sportTypes?.[0])}
                                                </div>
                                            )}
                                            <button className={styles.heartButton}>
                                                <Heart size={20} />
                                            </button>
                                        </div>

                                        <div className={styles.venueBody}>
                                            <h3 className={styles.venueName}>{venue.name}</h3>

                                            <div className={styles.venueRating}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} size={16} fill={star <= Math.round(venue.avgRating || 0) ? '#FFC107' : 'none'} color="#FFC107" />
                                                ))}
                                                <span className={styles.ratingValue}>
                                                    {(venue.avgRating || 0).toFixed(1)}
                                                </span>
                                                <span className={styles.reviewCount}>
                                                    ({venue.reviewCount || 0})
                                                </span>
                                            </div>

                                            <div className={styles.venueInfo}>
                                                <span>{venue.fields?.length || 0} sân khả dụng</span>
                                            </div>

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
                                            {venue.sportTypes?.length > 0 && (
                                                <div className={styles.sportTags}>
                                                    {venue.sportTypes.slice(0, 2).map(st => (
                                                        <span key={st} className="sport-tag">
                                                            <span className={getSportColorClass(st)} style={{ display: 'flex' }}>
                                                                {getSportIcon(st)}
                                                            </span>
                                                            {getSportLabel(st)}
                                                        </span>
                                                    ))}
                                                    {venue.sportTypes.length > 2 && (
                                                        <span className="sport-tag" style={{ color: 'var(--text-secondary)' }}>
                                                            +{venue.sportTypes.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.venueFooter}>
                                            <div className={styles.venuePrice}>
                                                <span className={styles.priceFrom}>Từ</span>
                                                <span className={styles.priceValue}>
                                                    {venue.finalPrice > 0
                                                        ? venue.finalPrice.toLocaleString('vi-VN') + 'đ'
                                                        : '0đ'}
                                                </span>
                                                <span className={styles.priceUnit}>/giờ</span>
                                            </div>
                                            <button
                                                className={styles.bookBtn}
                                                onClick={e => { e.preventDefault(); window.location.href = `/venues/${venue.id}`; }}
                                            >
                                                Đặt sân
                                            </button>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        
                        {/* HIỂN THỊ CÁC NÚT BẤM SỐ TRANG ĐỘNG */}
                        {!loading && displayedVenues.length > 0 && (
                            <>
                                {totalPages > 1 && (
                                    <div className={styles.pagination}>
                                        <button 
                                            className={styles.pageArrow} 
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            return (
                                                <button 
                                                    key={pageNum} 
                                                    className={`${styles.pageNum} ${currentPage === pageNum ? styles.pageActive : ''}`}
                                                    onClick={() => {
                                                        setCurrentPage(pageNum);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' }); // Tự động cuộn lên đầu khi sang trang
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}

                                        <button 
                                            className={styles.pageArrow} 
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                                <div className={styles.pageInfo}>
                                    Hiển thị {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, displayedVenues.length)} của {displayedVenues.length} sân
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
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
