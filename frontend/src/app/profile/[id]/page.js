'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersAPI, venuesAPI } from '@/lib/api';
import { 
    Mail, Phone, Calendar, CheckCircle, XCircle,
    MapPin, Star, Heart, Car, Wifi, Lock, UtensilsCrossed, Building2
} from 'lucide-react';
import profileStyles from '../profile.module.css';
import venueStyles from '../../venues/venues.module.css';
import { getSportColorClass, getSportLabel, getSportIcon } from '@/components/venue/SportIcons';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function PublicProfilePage({ params }) {
    const userId = use(params).id;
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [profileRes, venuesRes] = await Promise.all([
                    usersAPI.getPublicProfile(userId),
                    venuesAPI.list({ ownerId: userId })
                ]);
                setUser(profileRes.data.data.user);
                
                // Process venues exactly like venues/page.js
                const processVenues = venuesRes.data.data.venues.map(v => {
                    let finalPrice = 0;
                    if (v.minPrice !== null && v.minPrice !== undefined && v.minPrice !== '') {
                        const cleanPrice = v.minPrice.toString().replace(/[^0-9]/g, '');
                        finalPrice = Number(cleanPrice);
                    } else {
                        const prices = v.fields?.flatMap(f => f.pricingRules?.map(r => r.price) || []) || [];
                        const calc = prices.length > 0 ? Math.min(...prices.map(Number)) : Infinity;
                        finalPrice = calc === Infinity ? 0 : calc;
                    }
                    return { ...v, finalPrice };
                });
                
                setVenues(processVenues);
            } catch (err) {
                console.error("Failed to load public profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (userId) loadData();
    }, [userId]);

    if (loading) return <div className={profileStyles.page}><div className="container" style={{padding: 40, textAlign: 'center'}}><div className="spinner-lg" style={{ margin: '100px auto' }} /></div></div>;
    
    if (!user) return <div className={profileStyles.page}><div className="container" style={{padding: 40, textAlign: 'center'}}><h1>Không tìm thấy người dùng</h1></div></div>;

    const roleLabels = {
        ADMIN: { label: 'Quản trị viên', color: '#FF9F0A' },
        OWNER: { label: 'Chủ sân', color: '#30D158' },
        CUSTOMER: { label: 'Khách hàng', color: '#0066FF' },
    };
    const role = roleLabels[user.role] || roleLabels.CUSTOMER;

    return (
        <div className={profileStyles.page}>
            {/* Hero Profile Section */}
            <div
                className={profileStyles.heroSection}
                style={user.coverImageUrl ? {
                    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,245,237,0.5) 60%, rgba(255,245,237,0.92) 100%), url('${user.coverImageUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                } : undefined}
            >
                <div className={profileStyles.heroContainer}>
                    <div className={profileStyles.heroContent}>
                        <div className={profileStyles.avatarLarge}>
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${SERVER_URL}${user.avatarUrl}`} alt={user.fullName} />
                            ) : (
                                user.fullName?.charAt(0)?.toUpperCase()
                            )}
                        </div>
                        <h1 className={profileStyles.userName}>{user.fullName}</h1>
                        <div className={profileStyles.roleBadge} style={{ background: role.color + '33', color: role.color }}>
                            {role.label}
                        </div>
                    </div>

                    <div className={profileStyles.infoStats}>
                        <div className={profileStyles.statCard}>
                            <div className={profileStyles.statContent}>
                                <span className={profileStyles.statLabel}>
                                    <Phone size={16} color="#FF6E40" />
                                    Số điện thoại
                                </span>
                                <span className={profileStyles.statValue}>{user.phone || 'Chưa cập nhật'}</span>
                            </div>
                        </div>
                        <div className={profileStyles.statCard}>
                            <div className={profileStyles.statContent}>
                                <span className={profileStyles.statLabel}>
                                    {user.isVerified ? (
                                        <CheckCircle size={16} color="#10B981" />
                                    ) : (
                                        <XCircle size={16} color="#6B7280" />
                                    )}
                                    Xác thực
                                </span>
                                <span className={profileStyles.statValue} style={{ color: user.isVerified ? '#10B981' : '#6B7280' }}>
                                    {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                                </span>
                            </div>
                        </div>
                        <div className={profileStyles.statCard}>
                            <div className={profileStyles.statContent}>
                                <span className={profileStyles.statLabel}>
                                    <Calendar size={16} color="#FF6E40" />
                                    Tham gia
                                </span>
                                <span className={profileStyles.statValue}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
                            </div>
                        </div>
                        <div className={profileStyles.statCard}>
                            <div className={profileStyles.statContent}>
                                <span className={profileStyles.statLabel}>
                                    <Building2 size={16} color="#0066FF" />
                                    Số lượng sân
                                </span>
                                <span className={profileStyles.statValue}>{venues.length} sân</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs - Only one tab for public profile */}
            <div className={profileStyles.navTabs}>
                <div className={profileStyles.tabsContainer}>
                    <button className={`${profileStyles.tab} ${profileStyles.active}`}>
                        <Building2 size={16} style={{marginRight: 6, display: 'inline-block', verticalAlign: '-3px'}} />
                        Danh sách sân
                    </button>
                    <button className={profileStyles.tab} style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                        Bài đăng (Sắp ra mắt)
                    </button>
                </div>
            </div>

            {/* Venues Content */}
            <div className={profileStyles.mainContent} style={{ maxWidth: 1200, margin: '0 auto' }}>
                {venues.length === 0 ? (
                    <div className={profileStyles.card} style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Building2 size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
                        <h2 style={{ fontSize: 20, color: '#374151', marginBottom: 8 }}>Chưa có sân nào</h2>
                        <p style={{ color: '#6B7280' }}>Chủ sân này hiện chưa có sân nào được đăng tải.</p>
                    </div>
                ) : (
                    <div className={venueStyles.grid}>
                        {venues.map((venue) => (
                            <Link key={venue.id} href={`/venues/${venue.id}`} className={venueStyles.venueCard}>
                                <div className={venueStyles.venueImage}>
                                    {venue.images?.length > 0 ? (
                                        <img src={venue.images[0].startsWith('http') ? venue.images[0] : `${SERVER_URL}${venue.images[0]}`} alt={venue.name} />
                                    ) : (
                                        <div className={venueStyles.venuePlaceholder}>
                                            {getSportIcon(venue.sportTypes?.[0])}
                                        </div>
                                    )}
                                    <button className={venueStyles.heartButton} onClick={(e) => e.preventDefault()}>
                                        <Heart size={20} />
                                    </button>
                                </div>

                                <div className={venueStyles.venueBody}>
                                    <h3 className={venueStyles.venueName}>{venue.name}</h3>

                                    <div className={venueStyles.venueRating}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star key={star} size={16} fill="#FFC107" color="#FFC107" />
                                        ))}
                                        <span className={venueStyles.ratingValue}>
                                            {venue.avgRating?.toFixed(1) || '5'}
                                        </span>
                                        <span className={venueStyles.reviewCount}>
                                            ({venue.reviewCount || 0})
                                        </span>
                                    </div>

                                    <div className={venueStyles.venueInfo}>
                                        <span>{venue.fields?.length || 0} sân khả dụng</span>
                                    </div>

                                    <div className={venueStyles.venueLocation}>
                                        <MapPin size={14} />
                                        <span>{venue.address}, {venue.district}, {venue.city}</span>
                                    </div>
                                    <div className={venueStyles.venueAmenities}>
                                        <Car size={20} />
                                        <Wifi size={20} />
                                        <Lock size={20} />
                                        <UtensilsCrossed size={20} />
                                    </div>
                                    {venue.sportTypes?.length > 0 && (
                                        <div className={venueStyles.sportTags}>
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

                                <div className={venueStyles.venueFooter}>
                                    <div className={venueStyles.venuePrice}>
                                        <span className={venueStyles.priceFrom}>Từ</span>
                                        <span className={venueStyles.priceValue}>
                                            {venue.finalPrice > 0
                                                ? venue.finalPrice.toLocaleString('vi-VN') + 'đ'
                                                : '0đ'}
                                        </span>
                                        <span className={venueStyles.priceUnit}>/giờ</span>
                                    </div>
                                    <button
                                        className={venueStyles.bookBtn}
                                        onClick={e => { e.preventDefault(); router.push(`/venues/${venue.id}`); }}
                                    >
                                        Đặt sân
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

