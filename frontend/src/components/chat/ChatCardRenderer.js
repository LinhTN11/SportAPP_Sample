'use client';
/* eslint-disable @next/next/no-img-element */

import styles from './ChatCardRenderer.module.css';
import VenueChatCard from '../VenueChatCard';
import BookingCreatedCard from './BookingCreatedCard';
import DatePicker from '../ui/DatePicker';
import CustomSelect from '../ui/CustomSelect';
import { getImageUrl } from '@/lib/api';
import { Calendar, Clock, MapPin, CheckCircle2, CloudRain, Wind, Droplets, AlertTriangle, Activity, Sun, CloudSun } from 'lucide-react';

/**
 * ChatCardRenderer
 * A universal component to render rich chat content (AI tools, Match cards, Venue suggestions)
 */
export default function ChatCardRenderer({ 
    type, 
    data, 
    onAction, 
    isLoading,
    messageId,
    // Booking form states (inherited from parent widget to maintain reactivity)
    bookingFormStates = {},
    // Widget mode - show booking form in modal instead of inline
    isWidgetContext = false,
    onOpenBookingModal = null
}) {
    if (!data) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    // --- 1. AI Assistant Types ---
    
    if (type === 'venues' && Array.isArray(data)) {
        return data.map((v, i) => (
            <VenueChatCard key={i} venue={v} onBookClick={(venue) => onAction(`BOOK_VENUE: ${venue.id}`)} />
        ));
    }

    if (type === 'options' || type === 'clarification') {
        const options = data.fields || data.options;
        const isFields = !!data.fields;

        return (
            <div className={isFields ? styles.fieldCardGrid : styles.optionsContainer}>
                {options.map((opt, j) => {
                    const label = typeof opt === 'object' ? opt.name : opt;
                    const value = typeof opt === 'object' ? opt.id : opt;
                    const pricing = typeof opt === 'object' ? opt.pricingRules : null;

                    if (isFields) {
                        return (
                            <div key={j} className={styles.fieldSelectionCard}>
                                <div className={styles.fieldCardIcon}><Activity size={24} style={{ color: '#FF6E40' }} /></div>
                                <div className={styles.fieldCardInfo}>
                                    <div className={styles.fieldCardName}>{label}</div>
                                    <div className={styles.fieldCardPrice}>
                                        {pricing && pricing.length > 0 ? `Từ ${formatPrice(pricing[0].price)}/h` : 'Giá linh hoạt'}
                                    </div>
                                </div>
                                <button className={styles.fieldSelectBtn} onClick={() => onAction(value)} disabled={isLoading}>Chọn</button>
                            </div>
                        );
                    }
                    return (
                        <button key={j} className={styles.optionChip} onClick={() => onAction(value)} disabled={isLoading}>
                            {label}
                        </button>
                    );
                })}
            </div>
        );
    }

    if (type === 'available_slots' && data.slots) {
        return (
            <div className={styles.slotDiscoveryContainer}>
                <div className={styles.slotDiscoveryHeader}>
                    <Clock size={14} className={styles.headerIcon} />
                    Giờ trống ngày {data.date}
                </div>
                <div className={styles.slotChipGrid}>
                    {data.slots.map((slot, j) => (
                        <button key={j} className={styles.slotDiscoveryChip} onClick={() => onAction(`Đặt sân vào lúc ${slot.time}`)} disabled={isLoading}>
                            {slot.time}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'booking_created') {
        return <BookingCreatedCard data={data} />;
    }

    if (type === 'booking_cancelled') {
        return (
            <div className={styles.bookingCancelledCard}>
                <div className={styles.bookingCancelledHeader}>
                    <CheckCircle2 size={18} className={styles.bookingCancelledIcon} />
                    <span>ĐÃ HỦY BOOKING</span>
                </div>

                <div className={styles.bookingCancelledBody}>
                    <div className={styles.bookingCancelledMeta}>
                        <span>{data.venueName || '-'}{data.fieldName ? ` - ${data.fieldName}` : ''}</span>
                        <span>{data.date || '-'} | {data.time || '-'}</span>
                    </div>

                    <button
                        type="button"
                        className={styles.bookingRebookBtn}
                        onClick={() => onAction?.(`create_booking fieldId=${data.fieldId}`)}
                        disabled={!data.fieldId}
                    >
                        Đặt lại
                    </button>
                </div>
            </div>
        );
    }

    if (type === 'weather') {
        const current = data.current || {};
        const forecast = Array.isArray(data.forecast) ? data.forecast : [];
        const warnings = Array.isArray(data.warnings) ? data.warnings : [];

        return (
            <div className={styles.weatherCard}>
                <div className={isWidgetContext ? styles.weatherMainGridWidget : styles.weatherMainGrid}>
                    <div className={styles.weatherPrimaryCol}>
                        <div className={isWidgetContext ? styles.weatherHeaderRowWidget : styles.weatherHeaderRow}>
                            <div className={styles.weatherIcon}><CloudSun size={32} style={{ color: '#FF6E40' }} /></div>
                            <div className={styles.weatherHeaderInfo}>
                                <div className={styles.weatherTitle + ' ' + (isWidgetContext ? styles.weatherTitleWidget : '')} title={data.locationLabel || data.city || 'hiện tại'}>
                                    {data.locationLabel || data.city || 'hiện tại'}
                                </div>
                            </div>
                        </div>
                        <div className={styles.weatherCurrentRowCentered + ' ' + (isWidgetContext ? styles.weatherCurrentRowWidget : '')}>
                            <div className={styles.weatherTemp}>{Math.round(current.temperature ?? 0)}°C</div>
                            <div className={styles.weatherCurrentMeta2 + ' ' + (isWidgetContext ? styles.weatherCurrentMetaWidget : '')}>
                                <div className={styles.weatherDesc}>{current.description || ''}</div>
                                <div className={styles.weatherMetaRow + ' ' + (isWidgetContext ? styles.weatherMetaRowWidget : '')}>
                                    <span className={styles.weatherMetaLine}><Droplets size={14} /> {current.humidity ?? '-'}%</span>
                                    <span className={styles.weatherMetaLine}><Wind size={14} /> {current.windSpeed ?? '-'} km/h</span>
                                </div>
                            </div>
                        </div>
                        {warnings.length > 0 && (
                            <div className={styles.weatherWarnings}>
                                {warnings.slice(0, 2).map((warning, index) => (
                                    <div key={index} className={styles.weatherWarningItem}>
                                        <AlertTriangle size={14} />
                                        <span>{warning.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {!isWidgetContext && forecast.length > 0 && (
                        <div className={styles.weatherSecondaryCol}>
                            <div className={styles.weatherForecast}>
                                {forecast.map((day, index) => (
                                    <div key={index} className={styles.weatherForecastDayPro + ' ' + styles.weatherForecastDayShadow}>
                                        <div className={styles.weatherForecastDateRow}>
                                            <span className={styles.weatherForecastDate}>{(day.date || '').slice(5, 10).replace('-', '/')}</span>
                                            <span className={styles.weatherForecastRainPro}><CloudRain size={13} /> {day.rainChance ?? '-'}%</span>
                                        </div>
                                        <div className={styles.weatherForecastIconPro}><CloudSun size={20} style={{ color: '#FF6E40' }} /></div>
                                        <div className={styles.weatherForecastTempsPro}>{Math.round(day.minTemp)}° - {Math.round(day.maxTemp)}°</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (type === 'booking_form') {
        const { fieldId, fieldName, venueName, availableFields } = data;

        // Widget mode: show compact preview with modal button
        if (isWidgetContext && onOpenBookingModal) {
            return (
                <div className={styles.bookingPreviewCard}>
                    <div className={styles.previewHeader}>
                        <h4>{venueName}</h4>
                        {fieldName && <span className={styles.previewBadge}>{fieldName}</span>}
                    </div>
                    <button 
                        className={styles.previewOpenBtn}
                        onClick={() => onOpenBookingModal(data)}
                    >
                        Đặt sân ngay
                    </button>
                </div>
            );
        }

        // Page mode: show full inline form
        const { 
            bookingDate, setBookingDate, 
            paymentType, setPaymentType,
            selectedFieldId, setSelectedFieldId,
            selectedSlots, handleSlotClick,
            availableSlots, isLoadingSlots,
            handleBookingSubmit
        } = bookingFormStates;

        const safeSetBookingDate = typeof setBookingDate === 'function' ? setBookingDate : () => {};
        const safeSetPaymentType = typeof setPaymentType === 'function' ? setPaymentType : () => {};
        const safeSetSelectedFieldId = typeof setSelectedFieldId === 'function' ? setSelectedFieldId : () => {};
        const safeHandleSlotClick = typeof handleSlotClick === 'function' ? handleSlotClick : () => {};
        const safeHandleBookingSubmit = typeof handleBookingSubmit === 'function' ? handleBookingSubmit : () => {};
        const safeSelectedSlots = Array.isArray(selectedSlots) ? selectedSlots : [];
        const safeAvailableSlots = Array.isArray(availableSlots) ? availableSlots : [];
        const safePaymentType = paymentType || 'DEPOSIT';
        const safeBookingDate = bookingDate || '';

        const activeFieldId = selectedFieldId || fieldId;
        const activeFieldName = availableFields?.find(f => f.id === activeFieldId)?.name || fieldName;

        return (
            <div className={styles.bookingFormContainer}>
                <div className={styles.formHeader}>
                    <div className={styles.formVenueInfo}>
                        <h4>{venueName}</h4>
                        {!availableFields && <div className={styles.formFieldBadge}>{fieldName}</div>}
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); safeHandleBookingSubmit(activeFieldId); }}>
                    {availableFields && availableFields.length > 0 && (
                        <div className={styles.formFullRow}>
                            <label className={styles.premiumLabel}>CHỌN SÂN</label>
                            <div className={styles.fieldSelectGroup}>
                                {availableFields.map((f, fi) => (
                                    <button 
                                        key={fi} type="button"
                                        className={`${styles.fieldChip} ${activeFieldId === f.id ? styles.fieldChipActive : ''}`}
                                        onClick={() => safeSetSelectedFieldId(f.id)}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.formTwoColRow}>
                        <div className={styles.formItem}>
                            <label className={styles.premiumLabel}>NGÀY ĐẶT</label>
                            <DatePicker value={safeBookingDate} onChange={safeSetBookingDate} minDate={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className={styles.formItem}>
                            <label className={styles.premiumLabel}>THANH TOÁN</label>
                            <CustomSelect
                                className={styles.premiumSelectWrap}
                                value={safePaymentType}
                                onChange={safeSetPaymentType}
                                options={[
                                    { value: 'DEPOSIT', label: 'Đặt cọc (10%)' },
                                    { value: 'FULL', label: 'Thanh toán đủ' },
                                ]}
                            />
                        </div>
                    </div>

                    {safeBookingDate && (
                        <div className={styles.timeSlotGridWrapper}>
                            <label className={styles.blockLabel}>Chọn khung giờ (tròn 1 tiếng)</label>
                            {isLoadingSlots ? (
                                <div className={styles.slotLoader}>Đang tìm giờ...</div>
                            ) : (
                                <div className={styles.timeGrid}>
                                    {safeAvailableSlots.map((slot, i) => (
                                        <div 
                                            key={i} 
                                            className={`${styles.timeBlock} ${slot.booked ? styles.timeBooked : ''} ${safeSelectedSlots.find(s => s.time === slot.time) ? styles.timeSelected : ''}`}
                                            onClick={() => safeHandleSlotClick(slot)}
                                        >
                                            <span className={styles.timeLabel}>{slot.displayLabel}</span>
                                            {slot.price > 0 && <span className={styles.timePrice}>{formatPrice(slot.price)}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button type="submit" className={styles.premiumSubmitBtn} disabled={isLoading || safeSelectedSlots.length !== 2}>
                        {isLoading ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
                    </button>
                </form>
            </div>
        );
    }

    // --- 2. Social / System Card Types ---

    if (data.action === 'MATCH_INIT') {
        return (
            <div className={styles.matchCard}>
                <div className={styles.matchBadge}>{data.sportType}</div>
                <div className={styles.matchContent}>
                    <div className={styles.matchDetail}>
                        <Calendar size={14} /> <span>{data.bookingDate}</span>
                    </div>
                    <div className={styles.matchDetail}>
                        <Clock size={14} /> <span>{data.startTime} - {data.endTime}</span>
                    </div>
                    <div className={styles.matchDetail}>
                        <MapPin size={14} /> <span>{data.district}, {data.city}</span>
                    </div>
                </div>
                <div className={styles.matchActions}>
                    <button className={styles.matchBtnPrimary} onClick={() => onAction('VIEW_MATCH_DETAILS', data.postId)}>Xem chi tiết</button>
                    <button className={styles.matchBtnSecondary} onClick={() => onAction('JOIN_MATCH', data.postId)}>Tham gia</button>
                </div>
            </div>
        );
    }

    if (data.action === 'VENUE_SUGGEST') {
        return (
            <div className={styles.venueSuggestCard}>
                <div className={styles.suggestImageContainer}>
                    <img src={getImageUrl(data.venueImage)} alt={data.venueName} className={styles.suggestImg} />
                    <div className={styles.suggestBadge}>Gợi ý sân</div>
                </div>
                <div className={styles.suggestBody}>
                    <h5>{data.venueName}</h5>
                    <p><MapPin size={12} /> {data.address}</p>
                    <div className={styles.suggestPriceRow}>
                        <div className={styles.suggestPrice}>{formatPrice(data.price)}</div>
                        <span className={styles.priceUnit}>/h</span>
                    </div>
                </div>
                <div className={styles.matchActions}>
                    <button className={styles.suggestBtn} onClick={() => onAction(`BOOK_VENUE: ${data.venueId}`)}>Đặt ngay</button>
                    {messageId && (
                        <button className={styles.matchBtnSecondary} onClick={() => onAction('ACCEPT_VENUE_SUGGESTION')}>
                            Đồng ý
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (data.action === 'VENUE_ACCEPT') {
        return (
            <div className={styles.systemStatusCard}>
                <CheckCircle2 size={16} className={styles.statusIcon} />
                <span><b>{data.acceptedBy}</b> đã đồng ý chọn <b>{data.venueName}</b></span>
            </div>
        );
    }

    if (data.action === 'SUPPORT_INIT') {
        return (
            <div className={`${styles.systemStatusCard} ${styles.supportInitCard}`}>
                <Activity size={16} className={styles.statusIcon} />
                <span>Phiên hỗ trợ mới về: <b>{data.category}</b></span>
            </div>
        );
    }

    return null;
}
