'use client';

import { MapPin, Star, Clock, Settings, Pencil, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { SportIcons, sportTypeLabels, getSportIcon, getSportLabel, getSportColorClass } from './SportIcons';
import styles from './VenueCard.module.css';



/**
 * Shared VenueCard component — used by both customer Find Venue
 * and owner Venue Management pages.
 *
 * @param {Object}   venue      - Venue data object
 * @param {string}   mode       - "customer" | "owner"
 * @param {Function} onManage   - Owner: manage callback
 * @param {Function} onEdit     - Owner: edit callback
 * @param {Function} onDelete   - Owner: delete callback
 * @param {Function} onClick    - Customer: click handler (or use href)
 * @param {string}   href       - Customer: link destination
 */
export default function VenueCard({
    venue,
    mode = 'customer',
    onManage,
    onEdit,
    onDelete,
    onClick,
    href,
    serverUrl,
}) {
    const SERVER_URL = serverUrl || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
    const hasImage = venue.images?.length > 0;
    const sportLabel = getSportLabel(venue.sportTypes?.[0]);
    const sportIcon = getSportIcon(venue.sportTypes?.[0]);
    const fieldCount = venue.fields?.length || venue._count?.fields || 0;
    const reviewCount = venue._count?.reviews || venue.reviewCount || 0;

    const cardContent = (
        <>
            {/* Image Section */}
            <div className={styles.image}>
                {hasImage ? (
                    <img
                        src={`${SERVER_URL}${venue.images[0]}`}
                        alt={venue.name}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        <span className={styles.placeholderIcon}>{sportIcon}</span>
                        <span className={styles.placeholderText}>Chưa có ảnh</span>
                    </div>
                )}

                {/* Status Badge */}
                <div className={styles.badge}>
                    <StatusBadge status={venue.status || 'APPROVED'} />
                </div>

                {/* Image count */}
                {hasImage && venue.images.length > 1 && (
                    <span className={styles.imageCount}>
                        +{venue.images.length - 1} ảnh
                    </span>
                )}
            </div>

            {/* Body */}
            <div className={styles.body}>
                <h3 className={styles.name}>{venue.name}</h3>

                {/* Rating */}
                <div className={styles.rating}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} fill="#FFC107" color="#FFC107" />
                    ))}
                    <span className={styles.ratingValue}>
                        {venue.avgRating?.toFixed(1) || '0.0'}
                    </span>
                    <span className={styles.reviewCount}>
                        ({reviewCount})
                    </span>
                </div>

                {/* Info row */}
                <div className={styles.info}>
                    <span>{fieldCount} sân khả dụng</span>
                </div>

                {/* Location */}
                <div className={styles.location}>
                    <MapPin size={14} />
                    <span>
                        {[venue.address, venue.district, venue.city]
                            .filter(Boolean)
                            .join(', ')}
                    </span>
                </div>

                {/* Time (show for owner) */}
                {mode === 'owner' && venue.openTime && (
                    <div className={styles.time}>
                        <Clock size={14} />
                        <span>{venue.openTime} – {venue.closeTime}</span>
                    </div>
                )}

                {/* Sport tags */}
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

            {/* Action bar — owner mode only */}
            {mode === 'owner' && (
                <div className={styles.actions}>
                    <button
                        className={`${styles.actionBtn} ${styles.actionManage}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onManage?.(venue); }}
                    >
                        <Settings size={14} />
                        Quản lý
                    </button>
                    <button
                        className={styles.actionBtn}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(venue); }}
                    >
                        <Pencil size={14} />
                        Sửa
                    </button>
                    <button
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(venue); }}
                        title="Xóa sân"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </>
    );

    return (
        <div className={styles.card}>
            {cardContent}
        </div>
    );
}

/* Re-export for grid usage */
export { styles as venueCardStyles };
