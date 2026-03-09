'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
    format,
    startOfWeek,
    addDays,
    eachDayOfInterval,
    isToday,
    getDay,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isSameMonth,
    getDate,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { fieldsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MapPin, CalendarDays, ClipboardList, Pencil, Plus, Trash2, DollarSign, Clock } from 'lucide-react';
import styles from './pricing.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const START_HOUR = 6;
const END_HOUR = 23; // grid shows 06:00 – 22:00 (last row starts at 22)
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// Columns: Mon(1) → Sat(6) → Sun(0)
const COL_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
const DAY_FULL = { 0: 'Chủ nhật', 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy' };

// 30-min time slots from START_HOUR to END_HOUR
const TIME_OPTIONS = Array.from({ length: (END_HOUR - START_HOUR) * 2 + 1 }, (_, i) => {
    const mins = START_HOUR * 60 + i * 30;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceTier(price) {
    const p = Number(price);
    if (!p) return null;
    if (p < 200000) return 'tier1';  // teal/blue — cheap
    if (p < 400000) return 'tier2';  // green — standard
    if (p < 700000) return 'tier3';  // amber — high
    return 'tier4';                  // red — peak
}

const TIER_INFO = {
    tier1: { label: 'Rẻ', color: '#0071E3' },
    tier2: { label: 'Vừa', color: '#30D158' },
    tier3: { label: 'Cao', color: '#FF9F0A' },
    tier4: { label: 'Cao điểm', color: '#FF3B30' },
};

function fmt(price) {
    return Number(price).toLocaleString('vi-VN');
}

function ruleCoversCell(rule, day, hour) {
    const dayOk = rule.dayOfWeek.length === 0 || rule.dayOfWeek.includes(day);
    if (!dayOk) return false;
    const t = `${String(hour).padStart(2, '0')}:00`;
    return rule.startTime <= t && rule.endTime > t;
}

function getRuleForCell(day, hour, rules) {
    return rules.find(r => ruleCoversCell(r, day, hour)) ?? null;
}

function sortDays(days) {
    // sort Mon→Sun
    const order = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    return [...days].sort((a, b) => order[a] - order[b]);
}

// ─── Component ────────────────────────────────────────────────────────────────

function PricingEditorContent() {
    const router = useRouter();
    const { fieldId } = useParams();
    const searchParams = useSearchParams();
    const { isAuthenticated, isOwner, loading: authLoading } = useAuth();

    const fieldName = searchParams.get('name') || 'Sân con';
    const venueName = searchParams.get('venue') || '';
    const sportType = searchParams.get('sport') || '';

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    // Week calendar navigation
    const [weekOffset, setWeekOffset] = useState(0);

    // Mini calendar month
    const [calMonth, setCalMonth] = useState(new Date());

    // Active tab
    const [activeTab, setActiveTab] = useState('grid');

    // Rule form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ label: '', dayOfWeek: [], startTime: '06:00', endTime: '08:00', price: '' });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Auth guard ──
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isOwner)) router.push('/login');
    }, [authLoading, isAuthenticated, isOwner, router]);

    // ── Load pricing rules ──
    const loadRules = useCallback(async () => {
        try {
            const { data } = await fieldsAPI.getPricing(fieldId);
            setRules(data.data.rules);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [fieldId]);

    useEffect(() => { if (isOwner) loadRules(); }, [isOwner, loadRules]);

    // ─── Week dates ───────────────────────────────────────────────────────────
    const today = new Date();
    const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
    const weekDates = COL_DAYS.map((_, i) => addDays(weekStart, i));

    // Which column index is today (only when viewing current week)
    const todayColIdx = weekOffset === 0
        ? COL_DAYS.indexOf(getDay(today) === 0 ? 0 : getDay(today))
        : -1;

    // ─── Form helpers ─────────────────────────────────────────────────────────
    const openNewRule = (prefillDay, prefillHour) => {
        setEditingId(null);
        setForm({
            label: '',
            dayOfWeek: prefillDay !== undefined ? [prefillDay] : [],
            startTime: prefillHour !== undefined ? `${String(prefillHour).padStart(2, '0')}:00` : '06:00',
            endTime: prefillHour !== undefined ? `${String(Math.min(prefillHour + 2, END_HOUR)).padStart(2, '0')}:00` : '08:00',
            price: '',
        });
        setFormError('');
        setShowForm(true);
    };

    const openEditRule = (rule) => {
        setEditingId(rule.id);
        setForm({
            label: rule.label || '',
            dayOfWeek: rule.dayOfWeek || [],
            startTime: rule.startTime,
            endTime: rule.endTime,
            price: String(Number(rule.price)),
        });
        setFormError('');
        setShowForm(true);
    };

    const handleCellClick = (day, hour) => {
        const existing = getRuleForCell(day, hour, rules);
        existing ? openEditRule(existing) : openNewRule(day, hour);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.price || Number(form.price) <= 0) { setFormError('Vui lòng nhập giá hợp lệ'); return; }
        if (form.startTime >= form.endTime) { setFormError('Giờ kết thúc phải sau giờ bắt đầu'); return; }
        setSaving(true); setFormError('');
        try {
            const payload = { ...form, price: parseFloat(form.price) };
            if (editingId) {
                await fieldsAPI.updatePricing(editingId, payload);
            } else {
                await fieldsAPI.createPricing(fieldId, payload);
            }
            await loadRules();
            setShowForm(false); setEditingId(null);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Lưu thất bại');
        } finally { setSaving(false); }
    };

    const handleDelete = async (ruleId) => {
        if (!confirm('Xóa quy tắc giá này?')) return;
        try {
            await fieldsAPI.deletePricing(ruleId);
            setRules(prev => prev.filter(r => r.id !== ruleId));
            if (editingId === ruleId) { setShowForm(false); setEditingId(null); }
        } catch { alert('Xóa thất bại'); }
    };

    // ─── Mini calendar ────────────────────────────────────────────────────────
    const calStart = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const calCells = Array.from({ length: 42 }, (_, i) => addDays(calStart, i));

    const dateHasPricing = (date) => {
        const dow = getDay(date);
        return rules.some(r => r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dow));
    };

    // ─── Next occurrences preview ─────────────────────────────────────────────
    const nextOccurrences = form.dayOfWeek.length > 0
        ? Array.from({ length: 21 }, (_, i) => addDays(today, i))
            .filter(d => form.dayOfWeek.includes(getDay(d)))
            .slice(0, 6)
        : [];

    // ─── Render guard ─────────────────────────────────────────────────────────
    if (authLoading || loading) {
        return (
            <div className={styles.loadingPage}>
                <span className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.page}>

            {/* ═══════════════════════════════════════════════════
                HEADER
            ═══════════════════════════════════════════════════ */}
            <div className={styles.header}>
                <div className={styles.headerContainer}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Quay lại
                    </button>

                    <div className={styles.headerInfo}>
                        <h1 className={styles.headerTitle}>Bảng giá — {fieldName}</h1>
                        <div className={styles.headerMeta}>
                            {venueName && <span className={styles.headerVenue}>{venueName}</span>}
                            {venueName && rules.length > 0 && <span className={styles.headerSep} />}
                            <span className={styles.ruleCount}>{rules.length} quy tắc</span>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => openNewRule()}>
                        + Quy tắc mới
                    </button>
                </div>
            </div>

            <div className="container">

                {/* ═══════════════════════════════════════════════════
                    TABS
                ═══════════════════════════════════════════════════ */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'grid' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('grid')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={16} /> Lịch tuần
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'rules' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('rules')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ClipboardList size={16} /> Danh sách quy tắc
                        {rules.length > 0 && <span className={styles.tabBadge}>{rules.length}</span>}
                    </button>
                </div>

                {/* ═══════════════════════════════════════════════════
                    TAB: SCHEDULE GRID
                ═══════════════════════════════════════════════════ */}
                {activeTab === 'grid' && (
                    <div className={styles.gridLayout}>

                        {/* ── Left: schedule ── */}
                        <div className={styles.scheduleWrap}>

                            {/* Week navigation */}
                            <div className={styles.weekNav}>
                                <button className={styles.weekNavBtn} onClick={() => setWeekOffset(w => w - 1)}>‹</button>
                                <span className={styles.weekLabel}>
                                    {format(weekDates[0], 'dd/MM', { locale: vi })} – {format(weekDates[6], 'dd/MM/yyyy', { locale: vi })}
                                </span>
                                <button className={styles.weekNavBtn} onClick={() => setWeekOffset(w => w + 1)}>›</button>
                                {weekOffset !== 0 && (
                                    <button className={styles.todayBtn} onClick={() => setWeekOffset(0)}>Hôm nay</button>
                                )}
                            </div>

                            {/* Grid */}
                            <div className={styles.gridScroll}>
                                <div className={styles.grid}>
                                    {/* Corner */}
                                    <div className={styles.cornerCell} />

                                    {/* Day headers */}
                                    {weekDates.map((date, colIdx) => (
                                        <div key={colIdx} className={`${styles.dayHeader} ${colIdx === todayColIdx ? styles.dayHeaderToday : ''}`}>
                                            <span className={styles.dayShort}>{DAY_SHORT[COL_DAYS[colIdx]]}</span>
                                            <span className={styles.dayDate}>{format(date, 'dd/MM')}</span>
                                            {isToday(date) && <span className={styles.todayDot} />}
                                        </div>
                                    ))}

                                    {/* Hour rows */}
                                    {HOURS.map(hour => (
                                        <React.Fragment key={hour}>
                                            <div className={styles.timeHeader}>
                                                {String(hour).padStart(2, '0')}:00
                                            </div>
                                            {COL_DAYS.map((day, colIdx) => {
                                                const rule = getRuleForCell(day, hour, rules);
                                                const tier = rule ? priceTier(rule.price) : null;
                                                return (
                                                    <div
                                                        key={`${day}-${hour}`}
                                                        className={`${styles.cell} ${tier ? styles[`cell_${tier}`] : styles.cellEmpty} ${colIdx === todayColIdx ? styles.cellToday : ''}`}
                                                        onClick={() => handleCellClick(day, hour)}
                                                        title={rule
                                                            ? `${rule.label || 'Quy tắc'}: ${fmt(rule.price)}đ/h (${rule.startTime}–${rule.endTime})`
                                                            : `${DAY_FULL[day]} ${String(hour).padStart(2, '0')}:00 — Nhấn để thêm giá`
                                                        }
                                                    >
                                                        {rule ? (
                                                            <>
                                                                <span className={styles.cellPrice}>{fmt(rule.price)}</span>
                                                                {rule.label && <span className={styles.cellLabel}>{rule.label}</span>}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className={styles.legend}>
                                <span className={styles.legendItem}>
                                    <span className={`${styles.legendSwatch} ${styles.legendEmpty}`} /> Chưa có giá
                                </span>
                                {(['tier1', 'tier2', 'tier3', 'tier4']).map((t, i) => (
                                    <span key={t} className={styles.legendItem}>
                                        <span className={`${styles.legendSwatch} ${styles[`legend_${t}`]}`} />
                                        {['< 200k', '200–400k', '400–700k', '> 700k'][i]}
                                    </span>
                                ))}
                            </div>

                            {/* Mini calendar */}
                            <div className={styles.calCard}>
                                <div className={styles.calHeader}>
                                    <button className={styles.calNavBtn} onClick={() => setCalMonth(m => subMonths(m, 1))}>‹</button>
                                    <span className={styles.calTitle} style={{ textTransform: 'capitalize' }}>
                                        {format(calMonth, 'MMMM yyyy', { locale: vi })}
                                    </span>
                                    <button className={styles.calNavBtn} onClick={() => setCalMonth(m => addMonths(m, 1))}>›</button>
                                </div>
                                <div className={styles.calGrid}>
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                        <div key={d} className={styles.calDayName}>{d}</div>
                                    ))}
                                    {calCells.map((date, i) => {
                                        const inMonth = isSameMonth(date, calMonth);
                                        const hasPricing = inMonth && dateHasPricing(date);
                                        const todayCell = isToday(date);
                                        return (
                                            <div key={i} className={`${styles.calCell} ${!inMonth ? styles.calCellOut : ''} ${todayCell ? styles.calCellToday : ''} ${hasPricing && !todayCell ? styles.calCellPriced : ''}`}>
                                                {getDate(date)}
                                                {hasPricing && !todayCell && <span className={styles.calDot} />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className={styles.calNote}>🟢 Ngày được tô màu = có quy tắc giá áp dụng</p>
                            </div>
                        </div>

                        {/* ── Right: Rule form panel ── */}
                        <div className={styles.formPanel}>
                            {!showForm ? (
                                <div className={styles.formEmpty}>
                                    <span className={styles.formEmptyIcon}>�</span>
                                    <strong className={styles.formEmptyTitle}>Chưa chọn khung giờ</strong>
                                    <p>Nhấn vào ô lịch để chỉnh sửa, hoặc tạo quy tắc mới.</p>
                                    <button className="btn btn-primary" onClick={() => openNewRule()}>+ Tạo quy tắc mới</button>
                                </div>
                            ) : (
                                <div className={styles.formCard}>
                                    <div className={styles.formCardHead}>
                                        <h3 className={styles.formCardTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {editingId ? <><Pencil size={18} /> Chỉnh sửa quy tắc</> : <><Plus size={18} /> Quy tắc giá mới</>}
                                        </h3>
                                        <button className={styles.closeBtn} onClick={() => { setShowForm(false); setEditingId(null); }}>×</button>
                                    </div>

                                    {formError && <div className="form-error" style={{ margin: '0 16px 12px' }}>{formError}</div>}

                                    <form onSubmit={handleSave} className={styles.ruleForm}>

                                        {/* Label */}
                                        <div className="form-group">
                                            <label className="form-label">Tên quy tắc</label>
                                            <input type="text" className="form-input"
                                                placeholder="VD: Cao điểm buổi tối, Cuối tuần..."
                                                value={form.label}
                                                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                            />
                                        </div>

                                        {/* Days */}
                                        <div className="form-group">
                                            <label className="form-label">Áp dụng cho ngày</label>
                                            <div className={styles.dayPicker}>
                                                <button type="button"
                                                    className={`${styles.dayChip} ${styles.dayChipAll} ${form.dayOfWeek.length === 0 ? styles.dayChipActive : ''}`}
                                                    onClick={() => setForm(f => ({ ...f, dayOfWeek: [] }))}>
                                                    Tất cả
                                                </button>
                                                {COL_DAYS.map(day => (
                                                    <button type="button" key={day}
                                                        className={`${styles.dayChip} ${form.dayOfWeek.includes(day) ? styles.dayChipActive : ''}`}
                                                        onClick={() => setForm(f => ({
                                                            ...f,
                                                            dayOfWeek: f.dayOfWeek.includes(day)
                                                                ? f.dayOfWeek.filter(d => d !== day)
                                                                : [...f.dayOfWeek, day],
                                                        }))}>
                                                        {DAY_SHORT[day]}
                                                    </button>
                                                ))}
                                            </div>
                                            {form.dayOfWeek.length === 0 && (
                                                <p className={styles.dayHint}>✓ Áp dụng cho tất cả các ngày trong tuần</p>
                                            )}
                                        </div>

                                        {/* Time range */}
                                        <div className="form-group">
                                            <label className="form-label">Khung giờ</label>
                                            <div className={styles.timeRange}>
                                                <select className="form-input" value={form.startTime}
                                                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}>
                                                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <span className={styles.timeArrow}>→</span>
                                                <select className="form-input" value={form.endTime}
                                                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}>
                                                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="form-group">
                                            <label className="form-label">Giá (VNĐ / giờ)</label>
                                            <div className={styles.priceWrap}>
                                                <input type="number" className="form-input" placeholder="300000"
                                                    min="1000" step="1000"
                                                    value={form.price}
                                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                                    style={{ paddingRight: 46, fontSize: 16, fontWeight: 700 }}
                                                />
                                                <span className={styles.priceSuffix}>đ/h</span>
                                            </div>
                                            {form.price && Number(form.price) > 0 && (
                                                <div className={styles.priceDisplay}>
                                                    <span className={styles.priceDisplayAmount}>{fmt(form.price)}</span>
                                                    <span className={styles.priceDisplayUnit}>đ / giờ</span>
                                                    {priceTier(form.price) && (
                                                        <span className={`${styles.tierBadge} ${styles[`tierBadge_${priceTier(form.price)}`]}`}>
                                                            {TIER_INFO[priceTier(form.price)].label}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className={styles.formActions}>
                                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                                {saving ? <span className="spinner" /> : (editingId ? 'Cập nhật' : '✓ Lưu quy tắc')}
                                            </button>
                                            {editingId && (
                                                <button type="button" className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(editingId)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* Upcoming occurrences preview */}
                                    {nextOccurrences.length > 0 && (
                                        <div className={styles.preview}>
                                            <p className={styles.previewTitle}>Lịch áp dụng tiếp theo</p>
                                            <div className={styles.previewDates}>
                                                {nextOccurrences.map((d, i) => (
                                                    <span key={i} className={styles.previewChip}>
                                                        {format(d, 'dd/MM (EEE)', { locale: vi })}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════
                    TAB: RULES LIST
                ═══════════════════════════════════════════════════ */}
                {activeTab === 'rules' && (
                    <div className={styles.rulesTab}>
                        <div className={styles.rulesHeader}>
                            <h2 className={styles.rulesTitle}>Tất cả quy tắc ({rules.length})</h2>
                        </div>

                        {rules.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon" style={{ opacity: 0.5, marginBottom: 12 }}>
                                    <DollarSign size={40} />
                                </div>
                                <div className="empty-state-title">Chưa có quy tắc giá nào</div>
                                <div className="empty-state-text">Tạo quy tắc đầu tiên để khách hàng có thể đặt sân</div>
                                <button className="btn btn-primary" onClick={() => { openNewRule(); setActiveTab('grid'); }}>
                                    Tạo quy tắc giá
                                </button>
                            </div>
                        ) : (
                            <div className={styles.ruleCards}>
                                {rules.map(rule => {
                                    const tier = priceTier(rule.price);
                                    const days = rule.dayOfWeek.length === 0
                                        ? 'Tất cả ngày trong tuần'
                                        : sortDays(rule.dayOfWeek).map(d => DAY_FULL[d]).join(', ');

                                    return (
                                        <div key={rule.id} className={`${styles.ruleCard} ${styles[`ruleCard_${tier}`]}`}>
                                            <div className={styles.ruleCardHead}>
                                                <div className={styles.ruleCardName}>
                                                    <span className={`${styles.tierDot} ${styles[`tierDot_${tier}`]}`} />
                                                    {rule.label || 'Khung giờ không tên'}
                                                </div>
                                                <div className={styles.ruleCardActions}>
                                                    <button className="btn btn-ghost btn-sm"
                                                        onClick={() => { openEditRule(rule); setActiveTab('grid'); }}>
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(rule.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={styles.ruleCardDetail}>
                                                <span><Clock size={14} /> {rule.startTime} – {rule.endTime}</span>
                                                <span><CalendarDays size={14} /> {days}</span>
                                            </div>

                                            <div className={styles.ruleCardFooter}>
                                                <div className={styles.ruleCardPrice}>
                                                    {fmt(rule.price)}<small>đ/h</small>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

export default function PricingEditorPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><span className="spinner" /></div>}>
            <PricingEditorContent />
        </Suspense>
    );
}

