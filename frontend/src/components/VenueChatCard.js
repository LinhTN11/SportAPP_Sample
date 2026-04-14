/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import styles from './ChatbotWidget.module.css';

export default function VenueChatCard({ venue, onBookClick }) {
    const formatPrice = (price) => {
        if (!price) return 'Liên hệ';
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ/h';
    };

    const imgSrc = venue.images && venue.images.length > 0
        ? (venue.images[0].startsWith('http') ? venue.images[0] : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${venue.images[0]}`)
        : null;

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e8e8e8',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
            {imgSrc && (
                <div style={{
                    width: '100%',
                    height: '100px',
                    overflow: 'hidden',
                }}>
                    <img
                        src={imgSrc}
                        alt={venue.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>
            )}
            <div style={{ padding: '10px 12px' }}>
                <h5 style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#222',
                    margin: '0 0 4px',
                    lineHeight: 1.3,
                }}>
                    {venue.name}
                </h5>
                <p style={{
                    fontSize: '11px',
                    color: '#888',
                    margin: '0 0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <MapPin size={12} style={{ color: '#888' }} /> {venue.address || `${venue.district}, ${venue.city}`}
                </p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {venue.avgRating > 0 && (
                            <span style={{
                                fontSize: '11px',
                                color: '#f59e0b',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                            }}>
                                <Star size={11} fill="#f59e0b" style={{ color: '#f59e0b' }} /> {venue.avgRating.toFixed(1)}
                            </span>
                        )}
                        {venue.distance && (
                            <span style={{
                                fontSize: '11px',
                                color: '#2196f3',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                            }}>
                                <MapPin size={11} style={{ color: '#2196f3' }} /> {venue.distance} km
                            </span>
                        )}
                        {venue.minPrice && (
                            <span style={{
                                fontSize: '11px',
                                color: '#ff6b35',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                            }}>
                                {formatPrice(venue.minPrice)}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginTop: '8px',
                }}>
                    <Link
                        href={`/venues/${venue.id}`}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 500,
                            borderRadius: '8px',
                            border: '1px solid #ff6b35',
                            color: '#ff6b35',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        Xem chi tiết
                    </Link>
                    {onBookClick && (
                        <button
                            onClick={() => onBookClick(venue)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                fontSize: '11px',
                                fontWeight: 500,
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            Đặt sân
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
