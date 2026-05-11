'use client';

import { createPortal } from 'react-dom';
import DatePicker from '../ui/DatePicker';
import CustomSelect from '../ui/CustomSelect';
import { Clock, MapPin, X } from 'lucide-react';
import styles from './BookingFormModal.module.css';

export default function BookingFormModal({ 
    isOpen, 
    onClose, 
    data, 
    onAction, 
    isLoading,
    bookingFormStates = {}
}) {
    if (!isOpen) return null;

    const { fieldId, fieldName, venueName, availableFields } = data || {};
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

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        safeHandleBookingSubmit(activeFieldId);
        onClose();
    };

    const content = (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>{venueName}</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <form className={styles.bookingForm} onSubmit={handleSubmit}>
                        {availableFields && availableFields.length > 0 && (
                            <div className={styles.formSection}>
                                <label className={styles.sectionLabel}>CHỌN SÂN</label>
                                <div className={styles.fieldGrid}>
                                    {availableFields.map((f, fi) => (
                                        <button
                                            key={fi}
                                            type="button"
                                            className={`${styles.fieldBtn} ${activeFieldId === f.id ? styles.fieldBtnActive : ''}`}
                                            onClick={() => safeSetSelectedFieldId(f.id)}
                                        >
                                            {f.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.formMainGrid}>
                            <div className={styles.formLeftCol}>
                                <div className={styles.formSection}>
                                    <label className={styles.sectionLabel}>NGÀY ĐẶT</label>
                                    <DatePicker
                                        value={safeBookingDate}
                                        onChange={safeSetBookingDate}
                                        minDate={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                                    />
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        <label className={styles.sectionLabel}>THANH TOÁN</label>
                                        <CustomSelect
                                            className={styles.selectWrap}
                                            value={safePaymentType}
                                            onChange={safeSetPaymentType}
                                            options={[
                                                { value: 'DEPOSIT', label: 'Đặt cọc (10%)' },
                                                { value: 'FULL', label: 'Thanh toán đủ' },
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formRightCol}>
                                <label className={styles.sectionLabel}>CHỌN KHUNG GIỜ (TRÒN 1 TIẾNG)</label>
                                {!safeBookingDate ? (
                                    <div className={styles.emptySlotsMsg}>Chọn ngày để xem khung giờ trống.</div>
                                ) : isLoadingSlots ? (
                                    <div className={styles.loadingMsg}>Đang tìm giờ...</div>
                                ) : safeAvailableSlots.length === 0 ? (
                                    <div className={styles.emptySlotsMsg}>Không có khung giờ trống cho ngày này.</div>
                                ) : (
                                    <div className={styles.slotGrid}>
                                        {safeAvailableSlots.map((slot, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className={`${styles.slotBtn} ${slot.booked ? styles.slotBooked : ''} ${safeSelectedSlots.find(s => s.time === slot.time) ? styles.slotSelected : ''}`}
                                                onClick={() => safeHandleSlotClick(slot)}
                                                disabled={slot.booked}
                                            >
                                                <span className={styles.slotTime}>{slot.displayLabel}</span>
                                                {slot.price > 0 && <span className={styles.slotPrice}>{formatPrice(slot.price)}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading || safeSelectedSlots.length !== 2}
                        >
                            {isLoading ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
