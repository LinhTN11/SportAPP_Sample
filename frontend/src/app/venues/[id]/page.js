'use client';

import { useState, useEffect, useMemo, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { venuesAPI, bookingsAPI, reviewsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
    MapPin, Star, Share2, Heart, ChevronRight, ChevronDown, ChevronLeft, Copy,
    Calendar, Clock, ShieldCheck, Info,
    Wifi, Car, UtensilsCrossed, Lock, Smartphone
} from 'lucide-react';
import styles from './venueDetail.module.css';
import PageFooter from '@/components/PageFooter';
import { getSportIcon, getSportLabel, getSportTagClass } from '@/components/venue/SportIcons';
import MapPicker from '@/components/MapPicker';
import DatePicker from '@/components/ui/DatePicker';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function VenueDetailPage({ params }) {
    const venueId = use(params).id;
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedField, setSelectedField] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [isBooking, setIsBooking] = useState(false);
    const [paymentType, setPaymentType] = useState('full'); // 'full' or 'deposit'
    
    // Custom Dropdown State
    const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
    const fieldDropdownRef = useRef(null);
    const [reviewsSortOpen, setReviewsSortOpen] = useState(false);
    const reviewsSortRef = useRef(null);
    
    // Gallery Modal State
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Reviews State
    const [reviewsFilter, setReviewsFilter] = useState('all'); // 'all', 5, 4, 3, 2, 1
    const [reviewsSort, setReviewsSort] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
    const [reviewsPage, setReviewsPage] = useState(1);
    const REVIEWS_PER_PAGE = 3;

    // Fetch venue details
    useEffect(() => {
        const loadVenue = async () => {
            try {
                const { data } = await venuesAPI.getById(venueId);
                setVenue(data.data.venue);
                if (data.data.venue.fields?.length > 0) {
                    setSelectedField(data.data.venue.fields[0]);
                }
            } catch (err) {
                console.error('Error loading venue:', err);
            } finally {
                setLoading(false);
            }
        };
        loadVenue();
    }, [venueId]);

    // Handle clicks outside of dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target)) {
                setFieldDropdownOpen(false);
            }
            if (reviewsSortRef.current && !reviewsSortRef.current.contains(e.target)) {
                setReviewsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch booked slots when date or field changes
    useEffect(() => {
        if (selectedField && selectedDate) {
            const loadSlots = async () => {
                try {
                    const { data } = await bookingsAPI.getFieldSlots(selectedField.id, selectedDate);
                    setBookedSlots(data.data.bookedSlots);
                    setSelectedSlots([]); // Clear time selection on change
                } catch (err) {
                    console.error('Error loading slots:', err);
                }
            };
            loadSlots();
        }
    }, [selectedField, selectedDate]);

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const formatPrice = (price) => {
        if (!price) return '0';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // --- Client-side pricing calculation (mirrors backend bookingService) ---
    const getSlotPrice = (pricingRules, slotStartMinutes, slotDurationMinutes, dayOfWeek) => {
        if (!pricingRules || pricingRules.length === 0) return 0;

        const bookStart = slotStartMinutes;
        let bookEnd = slotStartMinutes + slotDurationMinutes;

        let totalPrice = 0;

        for (const rule of pricingRules) {
            // Check dayOfWeek match
            if (rule.dayOfWeek && rule.dayOfWeek.length > 0 && !rule.dayOfWeek.includes(dayOfWeek)) {
                continue;
            }

            let ruleStart = timeToMinutes(rule.startTime);
            let ruleEnd = timeToMinutes(rule.endTime);
            if (ruleEnd <= ruleStart) ruleEnd += 24 * 60;

            // Test 3 shifts for midnight-crossing
            const intervals = [
                { start: ruleStart - 24 * 60, end: ruleEnd - 24 * 60 },
                { start: ruleStart, end: ruleEnd },
                { start: ruleStart + 24 * 60, end: ruleEnd + 24 * 60 },
            ];

            for (const iv of intervals) {
                const overlapStart = Math.max(bookStart, iv.start);
                const overlapEnd = Math.min(bookEnd, iv.end);
                if (overlapStart < overlapEnd) {
                    const overlapHours = (overlapEnd - overlapStart) / 60;
                    totalPrice += overlapHours * Number(rule.price);
                }
            }
        }

        // Fallback: first matching rule
        if (totalPrice === 0) {
            const matchingRule = pricingRules.find(r =>
                !r.dayOfWeek || r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek)
            );
            if (matchingRule) {
                totalPrice = (slotDurationMinutes / 60) * Number(matchingRule.price);
            }
        }

        return Math.round(totalPrice);
    };

    // Get the price-per-hour for a field on a specific date (for display in field cards)
    const getFieldDisplayPrice = (field, dateStr) => {
        if (!field?.pricingRules || field.pricingRules.length === 0) return 0;
        const dayOfWeek = new Date(dateStr).getDay(); // 0=Sun
        // Find the first rule that matches this day
        const matchingRule = field.pricingRules.find(r =>
            !r.dayOfWeek || r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek)
        ) || field.pricingRules[0];
        return Number(matchingRule.price);
    };

    // Get the day-of-week number for the selected date
    const selectedDayOfWeek = useMemo(() => new Date(selectedDate).getDay(), [selectedDate]);

    // Generate time slots (every 30 mins)
    const timeSlots = useMemo(() => {
        // Fallback to 05:00 and 22:00 if venue times aren't specified
        const openStr = venue?.openTime || '05:00';
        const closeStr = venue?.closeTime || '22:00';
        
        const slots = [];
        const [openH, openM] = openStr.split(':').map(Number);
        const [closeH, closeM] = closeStr.split(':').map(Number);
        
        let current = openH * 60 + openM;
        let end = closeH * 60 + closeM;

        // Handle case where venue closes after midnight (e.g. 02:00)
        if (end <= current) {
            end += 24 * 60; 
        }
        
        while (current < end) {
            const h = Math.floor(current / 60) % 24;
            const m = current % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
            const currentEnd = current + 30;
            
            // Check if slot overlaps with booked slots
            const isBooked = bookedSlots.some(s => {
                const sStart = timeToMinutes(s.startTime);
                const sEnd = timeToMinutes(s.endTime);
                // Overlap condition: max(start) < min(end)
                return Math.max(current, sStart) < Math.min(currentEnd, sEnd);
            });
            
            // Realtime filter: Check if slot is in the past for today
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const nowMinutes = today.getHours() * 60 + today.getMinutes();
            const isPast = selectedDate === todayStr && current < nowMinutes;
            
            let endH = Math.floor(currentEnd / 60) % 24;
            const endM = currentEnd % 60;
            const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

            // Calculate price for this 30-min slot based on pricing rules + selected date
            const slotPrice = selectedField
                ? getSlotPrice(selectedField.pricingRules, current, 30, selectedDayOfWeek)
                : 0;

            slots.push({ 
                time: timeStr, 
                displayLabel: `${timeStr} - ${endTimeStr}`,
                minutes: current, 
                isBooked: isBooked || isPast,
                price: slotPrice,
            });
            current += 30; // 30 min slots
        }
        return slots;
    }, [venue, bookedSlots, selectedField, selectedDayOfWeek]);

    const handleTimeClick = (slot) => {
        if (slot.isBooked) return;
        
        // Start fresh if nothing selected, or if user clicks to restart
        if (selectedSlots.length === 0 || selectedSlots.length > 1) {
            setSelectedSlots([slot]);
            return;
        }

        // If exactly 1 slot is currently selected, treat it as the START, and the newly clicked slot as END
        const firstSlot = selectedSlots[0];
        
        // If clicking the same slot, clear it
        if (firstSlot.time === slot.time) {
            setSelectedSlots([]);
            return;
        }

        const minMinutes = Math.min(firstSlot.minutes, slot.minutes);
        const maxMinutes = Math.max(firstSlot.minutes, slot.minutes);

        // Find all slots in between
        const rangeSlots = timeSlots.filter(s => s.minutes >= minMinutes && s.minutes <= maxMinutes);

        // Check if any slot in the range is already booked
        const hasBookedInRange = rangeSlots.some(s => s.isBooked);

        if (hasBookedInRange) {
            alert('Không thể chọn khoảng thời gian này vì có lịch đã được đặt ở giữa.');
            setSelectedSlots([slot]); // Restart selection from the new click
            return;
        }

        // If valid, select all slots in the range
        setSelectedSlots(rangeSlots);
    };

    // Calculate end time
    const getEndTime = (slots) => {
        if (!slots || slots.length === 0) return '';
        // Slots are ordered by click sequence, we need to sort them chronologically to find the true end
        const sorted = [...slots].sort((a, b) => a.minutes - b.minutes);
        const lastSlot = sorted[sorted.length - 1];
        
        let endMinutes = lastSlot.minutes + 30;
        let endH = Math.floor(endMinutes / 60) % 24;
        let endM = endMinutes % 60;
        
        return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    };

    const galleryClass = useMemo(() => {
        if (!venue?.images || venue.images.length === 0) return styles.gallery;
        if (venue.images.length === 1) return `${styles.gallery} ${styles.gallerySingle}`;
        if (venue.images.length === 2) return `${styles.gallery} ${styles.galleryDouble}`;
        return styles.gallery;
    }, [venue?.images]);

    const openGallery = (index) => {
        setCurrentImageIndex(index);
        setIsGalleryOpen(true);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    const closeGallery = () => {
        setIsGalleryOpen(false);
        document.body.style.overflow = 'auto';
    };

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % venue.images.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + venue.images.length) % venue.images.length);
    };

    const handleBooking = async () => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/venues/${venueId}`);
            return;
        }
        
        if (selectedSlots.length === 0 || !selectedField) {
            alert('Vui lòng chọn đầy đủ ngày, sân và khung giờ');
            return;
        }

        try {
            setIsBooking(true);
            const sortedSelected = [...selectedSlots].sort((a, b) => a.minutes - b.minutes);
            const startMinutes = sortedSelected[0].minutes;
            const endMinutes = sortedSelected[sortedSelected.length - 1].minutes + 30; // 30 min per slot
            
            // Format to exact HH:mm strictly
            const sH = Math.floor(startMinutes / 60) % 24;
            const sM = startMinutes % 60;
            const eH = Math.floor(endMinutes / 60) % 24;
            const eM = endMinutes % 60;

            const startTime = `${sH.toString().padStart(2, '0')}:${sM.toString().padStart(2, '0')}`;
            const endTime = `${eH.toString().padStart(2, '0')}:${eM.toString().padStart(2, '0')}`;
            
            // Ensure date is strictly YYYY-MM-DD
            const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
            
            const payload = {
                fieldId: selectedField.id,
                bookingDate: formattedDate,
                startTime,
                endTime,
                paymentMethod: 'DIRECT'
            };
            
            const { data } = await bookingsAPI.create(payload);
            router.push(`/bookings`);
        } catch (err) {
            console.error('Booking failed:', err.response?.data || err);
            
            // Extract validation error messages if available
            let errorMsg = 'Đã có lỗi xảy ra khi đặt sân';
            if (err.response?.data?.errors) {
                errorMsg = err.response.data.errors.map(e => e.message).join('\n');
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            }
            alert(`Lỗi đặt sân:\n${errorMsg}`);
        } finally {
            setIsBooking(false);
        }
    };

    // --- Reviews Logic ---
    const processedReviews = useMemo(() => {
        if (!venue?.reviews) return [];
        let result = [...venue.reviews];

        // 1. Filter
        if (reviewsFilter !== 'all') {
            result = result.filter(r => r.rating === parseInt(reviewsFilter));
        }

        // 2. Sort
        result.sort((a, b) => {
            if (reviewsSort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (reviewsSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (reviewsSort === 'highest') return b.rating - a.rating;
            if (reviewsSort === 'lowest') return a.rating - b.rating;
            return 0;
        });

        return result;
    }, [venue?.reviews, reviewsFilter, reviewsSort]);

    const paginatedReviews = useMemo(() => {
        const startIndex = (reviewsPage - 1) * REVIEWS_PER_PAGE;
        return processedReviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
    }, [processedReviews, reviewsPage]);

    const totalReviewPages = Math.ceil(processedReviews.length / REVIEWS_PER_PAGE);

    // Calculate rating counts for the filter bar
    const ratingCounts = useMemo(() => {
        const counts = { 'all': venue?.reviews?.length || 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        venue?.reviews?.forEach(r => {
            if (counts[r.rating] !== undefined) counts[r.rating]++;
        });
        return counts;
    }, [venue?.reviews]);

    if (loading) return <div className={styles.page}><div className="container"><div className="spinner-lg" style={{ margin: '100px auto' }} /></div></div>;
    if (!venue) return <div className={styles.page}><div className="container"><h1>Không tìm thấy sân</h1></div></div>;

    const images = venue.images?.length > 0 ? venue.images : [];
    const avgRating = venue.avgRating || 0;
    
    // Calculate star distributions
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (venue.reviews) {
        venue.reviews.forEach(r => {
            const roundedRating = Math.round(r.rating);
            if (roundedRating >= 1 && roundedRating <= 5) {
                starCounts[roundedRating]++;
            }
        });
    }
    const totalReviews = venue.reviews?.length || 0;

    // Calculate price based on pricing rules matching selected date + selected time slots
    const totalHours = selectedSlots.length * 0.5;
    const calculatedPrice = (!selectedField?.pricingRules || selectedSlots.length === 0)
        ? getFieldDisplayPrice(selectedField, selectedDate)
        : selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
    const displayPricePerHour = getFieldDisplayPrice(selectedField, selectedDate);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Breadcrumbs */}
                <nav className={styles.breadcrumb}>
                    <Link href="/">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <Link href="/venues">Tìm sân</Link>
                    <ChevronRight size={14} />
                    <span>{venue.name}</span>
                </nav>

                {/* Header */}
                <header className={styles.venueHeader}>
                    <div className={styles.venueTitleRow}>
                        <div>
                            <h1 className={styles.venueName}>
                                {venue.name}
                                <span 
                                    className={styles.idBadge} 
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(venue.id); alert('Đã copy ID sân chung!'); }}
                                    title="Copy Venue ID cho AI"
                                >
                                    (ID: {venue.id}) <Copy size={14} style={{marginLeft: 4}} />
                                </span>
                            </h1>
                            <div className={styles.venueMeta}>
                                <div className={styles.rating}>
                                    <Star size={16} fill="#FFC107" color="#FFC107" />
                                    <span>{avgRating.toFixed(1)} ({venue.reviewCount || 0} đánh giá)</span>
                                </div>
                                <div className={styles.location}>
                                    <MapPin size={16} />
                                    <span>{venue.address}, {venue.district}, {venue.city}</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.actionButtons}>
                            <button className="btn btn-ghost btn-icon"><Share2 size={20} /></button>
                            <button className="btn btn-ghost btn-icon"><Heart size={20} /></button>
                        </div>
                    </div>
                </header>

                {/* Gallery - Full Width */}
                <section className={galleryClass}>
                    {images.length > 0 ? (
                        <>
                            <img 
                                src={images[0].startsWith('http') ? images[0] : `${SERVER_URL}${images[0]}`} 
                                className={styles.mainImage} 
                                alt={venue.name} 
                                onClick={() => openGallery(0)} 
                            />
                            {images.length === 2 && (
                                <img 
                                    src={images[1].startsWith('http') ? images[1] : `${SERVER_URL}${images[1]}`} 
                                    className={styles.sideImage} 
                                    alt={venue.name} 
                                    onClick={() => openGallery(1)} 
                                />
                            )}
                            {images.length >= 3 && (
                                <>
                                    <img 
                                        src={images[1].startsWith('http') ? images[1] : `${SERVER_URL}${images[1]}`} 
                                        className={styles.sideImage} 
                                        alt={`${venue.name} 2`} 
                                        onClick={() => openGallery(1)} 
                                    />
                                    <div className={styles.lastImageWrapper} onClick={() => openGallery(2)}>
                                        <img src={images[2].startsWith('http') ? images[2] : `${SERVER_URL}${images[2]}`} alt={`${venue.name} 3`} />
                                        {images.length > 3 && (
                                            <div className={styles.moreImagesOverlay}>
                                                + {images.length - 3} Ảnh khác
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={styles.mainImage} style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getSportIcon(venue.sportTypes?.[0])}
                        </div>
                    )}
                </section>

                {/* Main Content Layout */}
                <div className={styles.contentLayout}>
                    <div className={styles.sections}>
                        
                        {/* Group 1: General Info */}
                        <div className={styles.infoGroup}>
                            {/* Description */}
                            <section>
                                <h3 className={styles.sectionTitle}>Mô tả</h3>
                                <p className={styles.description}>{venue.description || 'Chưa có mô tả cho sân này.'}</p>
                            </section>

                            {/* Amenities */}
                            <section>
                                <h3 className={styles.sectionTitle}>Tiện ích</h3>
                                <div className={styles.amenitiesGrid}>
                                    <div className={styles.amenityItem}>
                                        <div className={styles.amenityIcon}><Wifi size={24} /></div>
                                        Wifi miễn phí
                                    </div>
                                    <div className={styles.amenityItem}>
                                        <div className={styles.amenityIcon}><Car size={24} /></div>
                                        Chỗ đậu xe
                                    </div>
                                    <div className={styles.amenityItem}>
                                        <div className={styles.amenityIcon}><Lock size={24} /></div>
                                        Tủ đồ an toàn
                                    </div>
                                    <div className={styles.amenityItem}>
                                        <div className={styles.amenityIcon}><UtensilsCrossed size={24} /></div>
                                        Căng tin
                                    </div>
                                    <div className={styles.amenityItem}>
                                        <div className={styles.amenityIcon}><Smartphone size={24} /></div>
                                        Sóng điện thoại
                                    </div>
                                </div>
                            </section>

                            {/* Map */}
                            <section>
                                <h3 className={styles.sectionTitle}>Vị trí</h3>
                                <div className={styles.mapSection}>
                                    <MapPicker 
                                        readOnly={true} 
                                        height={350} 
                                        value={{ 
                                            latitude: venue.latitude, 
                                            longitude: venue.longitude,
                                            fullAddress: `${venue.address}, ${venue.district}, ${venue.city}`
                                        }} 
                                    />
                                </div>
                            </section>
                        </div>

                        {/* Group 2: Fields & Pricing */}
                        <div className={styles.infoGroup}>
                            <section>
                                <h3 className={styles.sectionTitle}>Danh sách sân ({venue.fields?.length || 0})</h3>
                                <div className={styles.fieldGrid}>
                                    {venue.fields?.map(field => (
                                        <div key={field.id} className={`${styles.fieldCard} ${selectedField?.id === field.id ? styles.fieldCardSelected : ''}`} onClick={() => setSelectedField(field)}>
                                            <div className={styles.fieldInfo}>
                                                <h4>
                                                    {field.name}
                                                    <span 
                                                        className={styles.idBadge} 
                                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(field.id); alert('Đã copy ID sân con để đặt lịch!'); }}
                                                        title="Copy ID sân con cho AI"
                                                    >
                                                        (ID đặt sân: {field.id}) <Copy size={12} style={{marginLeft: 4}} />
                                                    </span>
                                                </h4>
                                                <span className={styles.fieldType}>{getSportLabel(field.sportType)} • {field.fieldType}</span>
                                            </div>
                                            <div className={styles.fieldPrice}>
                                                <span className={`${styles.priceValue} ${styles.orangePrimary}`}>{formatPrice(getFieldDisplayPrice(field, selectedDate))}đ</span>
                                                <span className={styles.priceUnit}>/giờ</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Reviews */}
                        <section>
                            <h3 className={styles.sectionTitle}>Đánh giá ({venue.reviews?.length || 0})</h3>
                            <div className={styles.reviewsSummary}>
                                <div className={styles.averageRatingBlock}>
                                    <span className={styles.bigRating}>{avgRating.toFixed(1)}</span>
                                    <div className={styles.rating}>
                                        <Star size={20} fill="#FFC107" color="#FFC107" />
                                    </div>
                                    <span className={styles.reviewCountInfo}>{totalReviews} đánh giá</span>
                                </div>
                                <div className={styles.ratingBars}>
                                    {[5, 4, 3, 2, 1].map(star => {
                                        const count = starCounts[star];
                                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                        return (
                                            <div key={star} className={styles.ratingBarRow}>
                                                <span>{star} sao</span>
                                                <div className={styles.progressBar}>
                                                    <div className={styles.progressFill} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                                <span>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className={styles.reviewControls}>
                                <div className={styles.filterChips}>
                                    <button 
                                        className={`${styles.chip} ${reviewsFilter === 'all' ? styles.chipActive : ''}`}
                                        onClick={() => { setReviewsFilter('all'); setReviewsPage(1); }}
                                    >
                                        Tất cả ({ratingCounts['all']})
                                    </button>
                                    {[5, 4, 3, 2, 1].map(star => (
                                        <button 
                                            key={star}
                                            className={`${styles.chip} ${reviewsFilter === star.toString() ? styles.chipActive : ''}`}
                                            onClick={() => { setReviewsFilter(star.toString()); setReviewsPage(1); }}
                                            disabled={ratingCounts[star] === 0}
                                        >
                                            {star} Sao ({ratingCounts[star]})
                                        </button>
                                    ))}
                                </div>
                                
                                <div className={`${styles.customDropdown} ${styles.sortDropdown}`} ref={reviewsSortRef}>
                                    <div 
                                        className={`${styles.dropdownTrigger} ${reviewsSortOpen ? styles.dropdownTriggerOpen : ''}`}
                                        onClick={() => setReviewsSortOpen(!reviewsSortOpen)}
                                    >
                                        <span>
                                            {reviewsSort === 'newest' && 'Mới nhất'}
                                            {reviewsSort === 'oldest' && 'Cũ nhất'}
                                            {reviewsSort === 'highest' && 'Đánh giá cao nhất'}
                                            {reviewsSort === 'lowest' && 'Đánh giá thấp nhất'}
                                        </span>
                                        <span className={`${styles.dropdownChevron} ${reviewsSortOpen ? styles.dropdownChevronOpen : ''}`}>
                                            <ChevronDown size={16} />
                                        </span>
                                    </div>
                                    
                                    {reviewsSortOpen && (
                                        <div className={`${styles.dropdownMenu} ${styles.dropdownMenuRight}`}>
                                            {[
                                                { value: 'newest', label: 'Mới nhất' },
                                                { value: 'oldest', label: 'Cũ nhất' },
                                                { value: 'highest', label: 'Đánh giá cao nhất' },
                                                { value: 'lowest', label: 'Đánh giá thấp nhất' }
                                            ].map(opt => (
                                                <div 
                                                    key={opt.value}
                                                    className={`${styles.dropdownOption} ${reviewsSort === opt.value ? styles.dropdownOptionActive : ''}`}
                                                    onClick={() => {
                                                        setReviewsSort(opt.value);
                                                        setReviewsPage(1);
                                                        setReviewsSortOpen(false);
                                                    }}
                                                >
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.reviewsContainer}>
                                <div className={styles.reviewList}>
                                    {paginatedReviews.length > 0 ? (
                                        paginatedReviews.map(review => (
                                            <div key={review.id} className={styles.reviewItem}>
                                                <div className={styles.reviewHeader}>
                                                    <div className={`avatar avatar-sm ${styles.avatar}`}>
                                                        {review.user?.avatarUrl ? <img src={review.user.avatarUrl} alt={review.user.fullName} /> : review.user?.fullName?.charAt(0)}
                                                    </div>
                                                    <div className={styles.reviewAuthor}>
                                                        <div className={styles.reviewAuthorName}>{review.user?.fullName}</div>
                                                        <div className={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</div>
                                                    </div>
                                                    <div className={styles.rating}>
                                                        <Star size={14} fill="#FFC107" color="#FFC107" />
                                                        <span>{review.rating}</span>
                                                    </div>
                                                </div>
                                                <p className={styles.reviewComment}>{review.comment}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.emptyText}>Chưa có đánh giá nào phù hợp với bộ lọc.</p>
                                    )}
                                </div>
                                
                                {totalReviewPages > 1 && (
                                    <div className={styles.pagination}>
                                        <button 
                                            className={styles.pageButton} 
                                            disabled={reviewsPage === 1}
                                            onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft size={16} /> Prev
                                        </button>
                                        
                                        <div className={styles.pageNumbers}>
                                            {Array.from({ length: totalReviewPages }, (_, i) => i + 1).map(pageNum => (
                                                <button 
                                                    key={pageNum}
                                                    className={`${styles.pageNum} ${reviewsPage === pageNum ? styles.pageNumActive : ''}`}
                                                    onClick={() => setReviewsPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            ))}
                                        </div>

                                        <button 
                                            className={styles.pageButton} 
                                            disabled={reviewsPage === totalReviewPages}
                                            onClick={() => setReviewsPage(p => Math.min(totalReviewPages, p + 1))}
                                        >
                                            Next <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                        {/* Booking Sidebar Widget */}
                        <aside className={styles.bookingWidget}>
                            <div className={styles.widgetHeader}>
                                <div className={`${styles.widgetPrice} ${styles.orangePrimary}`}>
                                    {formatPrice(totalHours > 0 ? calculatedPrice : displayPricePerHour)}đ 
                                    <span>{totalHours > 0 ? ` / ${totalHours} giờ` : ' / giờ'}</span>
                                </div>
                            </div>

                            <div className={styles.bookingForm}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formItem}>
                                        <label>Ngày đặt</label>
                                        <DatePicker 
                                            value={selectedDate} 
                                            onChange={(val) => setSelectedDate(val)} 
                                            minDate={new Date().toISOString().split('T')[0]} 
                                        />
                                    </div>
                                    <div className={styles.formItem} ref={fieldDropdownRef}>
                                        <label>Chọn sân</label>
                                        <div className={styles.customDropdown}>
                                            <div 
                                                className={`${styles.dropdownTrigger} ${fieldDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                                onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
                                            >
                                                <span>{selectedField?.name || 'Vui lòng chọn sân...'}</span>
                                                <span className={`${styles.dropdownChevron} ${fieldDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                                    <ChevronDown size={16} />
                                                </span>
                                            </div>
                                            
                                            {fieldDropdownOpen && (
                                                <div className={styles.dropdownMenu}>
                                                    {venue.fields?.map(f => (
                                                        <div 
                                                            key={f.id} 
                                                            className={`${styles.dropdownOption} ${selectedField?.id === f.id ? styles.dropdownOptionActive : ''}`}
                                                            onClick={() => {
                                                                setSelectedField(f);
                                                                setFieldDropdownOpen(false);
                                                            }}
                                                        >
                                                            {f.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.formItemBlock}>
                                        <label className={styles.blockLabel}>Khung giờ (Chọn 1 hoặc nhiều)</label>
                                        <div className={styles.timeGrid}>
                                            {timeSlots.map(s => {
                                                const isSelected = selectedSlots.some(sel => sel.time === s.time);
                                                return (
                                                    <button 
                                                        key={s.time}
                                                        className={`${styles.timeBlock} ${isSelected ? styles.timeSelected : ''} ${s.isBooked ? styles.timeBooked : ''}`}
                                                        onClick={() => handleTimeClick(s)}
                                                        disabled={s.isBooked}
                                                    >
                                                        <span className={styles.timeLabel}>{s.displayLabel}</span>
                                                        {s.price > 0 && <span className={styles.timePrice}>{formatPrice(s.price * 2)}đ/h</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    {/* Payment Type Selection */}
                                    <div className={styles.formItemBlock}>
                                        <label className={styles.blockLabel}>Phương thức thanh toán</label>
                                        <div className={styles.paymentOptions}>
                                            <div 
                                                className={`${styles.paymentOption} ${paymentType === 'full' ? styles.paymentSelected : ''}`}
                                                onClick={() => setPaymentType('full')}
                                            >
                                                <div className={styles.paymentRadio}>
                                                    <div className={styles.radioInner}></div>
                                                </div>
                                                <div className={styles.paymentContent}>
                                                    <span className={styles.paymentTitle}>Thanh toán toàn bộ</span>
                                                    <span className={styles.paymentDesc}>Trả {formatPrice(calculatedPrice)}đ ngay lúc này</span>
                                                </div>
                                            </div>
                                            <div 
                                                className={`${styles.paymentOption} ${paymentType === 'deposit' ? styles.paymentSelected : ''}`}
                                                onClick={() => setPaymentType('deposit')}
                                            >
                                                <div className={styles.paymentRadio}>
                                                    <div className={styles.radioInner}></div>
                                                </div>
                                                <div className={styles.paymentContent}>
                                                    <span className={styles.paymentTitle}>Đặt cọc (10%)</span>
                                                    <span className={styles.paymentDesc}>Trả trước {formatPrice(calculatedPrice * 0.1)}đ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    className={`btn ${styles.bookButton} ${styles.orangeButton}`} 
                                    onClick={handleBooking} 
                                    disabled={isBooking || selectedSlots.length === 0 || selectedSlots.length % 2 !== 0}
                                >
                                    {isBooking ? 'Đang xử lý...' : (selectedSlots.length === 0 ? 'Chọn khung giờ để đặt' : (selectedSlots.length % 2 !== 0 ? 'Vui lòng chọn chẵn giờ (1h, 2h...)' : `Đặt sân từ ${selectedSlots[0].time} đến ${getEndTime(selectedSlots)}`))}
                                </button>
                            <div className={styles.widgetFooter}>
                                <p style={{ color: 'var(--text-tertiary)' }}>Bạn chưa bị trừ tiền ngay lúc này</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
            <PageFooter />

            {/* Gallery Lightbox Modal */}
            {isGalleryOpen && images.length > 0 && (
                <div className={styles.galleryModal} onClick={closeGallery}>
                    <div className={styles.modalClose}>
                        <span>&times;</span>
                    </div>
                    
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={images[currentImageIndex].startsWith('http') ? images[currentImageIndex] : `${SERVER_URL}${images[currentImageIndex]}`} 
                            alt={`Gallery image ${currentImageIndex + 1}`} 
                        />
                        
                        {images.length > 1 && (
                            <>
                                <button className={`${styles.navButton} ${styles.prevButton}`} onClick={prevImage}>
                                    &#10094;
                                </button>
                                <button className={`${styles.navButton} ${styles.nextButton}`} onClick={nextImage}>
                                    &#10095;
                                </button>
                            </>
                        )}
                        
                        <div className={styles.imageCounter}>
                            {currentImageIndex + 1} / {images.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
