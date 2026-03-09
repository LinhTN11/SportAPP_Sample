'use client';

import { useState } from 'react';
import styles from './Advancedfilter.module.css';

const DEFAULT = {
    priceMin: 0, priceMax: 1000000,
    distance: '', amenities: [], fieldTypes: [],
};

const AMENITIES = [
    { value: 'wifi',      label: 'WiFi miễn phí' },
    { value: 'parking',   label: 'Bãi đỗ xe' },
    { value: 'canteen',   label: 'Căn-tin' },
    { value: 'locker',    label: 'Phòng thay đồ' },
    { value: 'equipment', label: 'Cho thuê dụng cụ' },
    { value: 'camera',    label: 'Camera an ninh' },
];

const FIELD_TYPES = [
    { value: '5',  label: 'Sân 5' },
    { value: '7',  label: 'Sân 7' },
    { value: '11', label: 'Sân 11' },
];

export default function AdvancedFilter({ onApply, onClear }) {
    const [f, setF] = useState(DEFAULT);
    const [priceRange, setPriceRange] = useState([0, 1000000]);

    const toggle = (key, val) =>
        setF(prev => ({
            ...prev,
            [key]: prev[key].includes(val)
                ? prev[key].filter(x => x !== val)
                : [...prev[key], val],
        }));

    const isActive = f.distance || f.amenities.length || f.fieldTypes.length
        || priceRange[0] > 0 || priceRange[1] < 1000000;

    const handleApply = () => onApply?.({ ...f, priceMin: priceRange[0], priceMax: priceRange[1] });
    const handleClear = () => { setF(DEFAULT); setPriceRange([0, 1000000]); onClear?.(); };

    // Tính % cho track màu
    const pct1 = (priceRange[0] / 1000000) * 100;
    const pct2 = (priceRange[1] / 1000000) * 100;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.card}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.title}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                        </svg>
                        Bộ lọc
                    </div>
                    {isActive && (
                        <button className={styles.clearBtn} onClick={handleClear}>Xóa</button>
                    )}
                </div>

                {/* ── Khoảng giá ── */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Khoảng giá</div>
                    <div
                        className={styles.sliderTrackWrap}
                        style={{ '--p1': `${pct1}%`, '--p2': `${pct2}%` }}
                    >
                        <div className={styles.sliderTrack} />
                        <div className={styles.sliderFill} />
                        <input type="range" min={0} max={1000000} step={50000}
                            value={priceRange[0]} className={styles.slider}
                            onChange={e => {
                                const v = Math.min(+e.target.value, priceRange[1] - 50000);
                                setPriceRange([v, priceRange[1]]);
                            }}
                        />
                        <input type="range" min={0} max={1000000} step={50000}
                            value={priceRange[1]} className={styles.slider}
                            onChange={e => {
                                const v = Math.max(+e.target.value, priceRange[0] + 50000);
                                setPriceRange([priceRange[0], v]);
                            }}
                        />
                    </div>
                    <div className={styles.priceLabels}>
                        <span>{priceRange[0] === 0 ? '0đ' : priceRange[0].toLocaleString('vi-VN') + 'đ'}</span>
                        <span>{priceRange[1].toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                {/* ── Khoảng cách ── */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Khoảng cách</div>
                    {[
                        { value: '2',  label: 'Dưới 2km' },
                        { value: '5',  label: '2-5km' },
                        { value: '10', label: '5-10km' },
                        { value: '99', label: 'Trên 10km' },
                    ].map(opt => (
                        <label key={opt.value} className={styles.radioRow}>
                            <span className={`${styles.radioCircle} ${f.distance === opt.value ? styles.radioChecked : ''}`}>
                                {f.distance === opt.value && <span className={styles.radioDot} />}
                            </span>
                            <input type="radio" name="distance" value={opt.value}
                                checked={f.distance === opt.value}
                                onChange={() => setF({ ...f, distance: opt.value })}
                                className={styles.hiddenInput}
                            />
                            <span className={styles.rowLabel}>{opt.label}</span>
                        </label>
                    ))}
                </div>

                {/* ── Tiện ích ── */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Tiện ích</div>
                    {AMENITIES.map(a => (
                        <label key={a.value} className={styles.checkRow}
                            onClick={() => toggle('amenities', a.value)}>
                            <span className={`${styles.checkbox} ${f.amenities.includes(a.value) ? styles.checkboxChecked : ''}`}>
                                {f.amenities.includes(a.value) && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </span>
                            <span className={styles.rowLabel}>{a.label}</span>
                        </label>
                    ))}
                </div>

                {/* ── Loại sân ── */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Loại sân</div>
                    {FIELD_TYPES.map(ft => (
                        <label key={ft.value} className={styles.checkRow}
                            onClick={() => toggle('fieldTypes', ft.value)}>
                            <span className={`${styles.checkbox} ${f.fieldTypes.includes(ft.value) ? styles.checkboxChecked : ''}`}>
                                {f.fieldTypes.includes(ft.value) && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </span>
                            <span className={styles.rowLabel}>{ft.label}</span>
                        </label>
                    ))}
                </div>

                {/* Nút Áp dụng */}
                <button className={styles.applyBtn} onClick={handleApply}>
                    Áp dụng
                </button>

            </div>
        </aside>
    );
}