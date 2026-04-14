/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { venuesAPI, fieldsAPI, uploadAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MapPin, Clock, Settings, Pencil, Trash2, Camera, Phone, ClipboardList, Pause, DollarSign, CheckCircle2, Clock3, Map, CircleDollarSign, BarChart2, Save, ChevronDown } from 'lucide-react';
import { sportTypeLabels, getSportIcon, getSportLabel } from '@/components/venue/SportIcons';
import VenueCard, { venueCardStyles } from '@/components/venue/VenueCard';
import styles from './owner.module.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

// statusMap removed — now handled by StatusBadge component inside VenueCard

const FormSelect = ({ value, onChange, options, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`${styles.customSelect} ${className}`} ref={containerRef}>
            <div
                className={`${styles.selectTrigger} ${isOpen ? styles.selectTriggerActive : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown size={16} className={`${styles.selectChevron} ${isOpen ? styles.selectChevronOpen : ''}`} />
            </div>
            {isOpen && (
                <div className={styles.selectMenu}>
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`${styles.selectOption} ${value === opt.value ? styles.selectOptionSelected : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function OwnerVenuesPage() {
    const router = useRouter();
    const { user, isAuthenticated, isOwner, loading: authLoading } = useAuth();
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showManage, setShowManage] = useState(null);
    const [form, setForm] = useState({
        name: '', phone: '', address: '', city: '', district: '',
        sportTypes: ['football'], description: '',
        openTime: '06:00', closeTime: '23:00',
        latitude: '', longitude: '', images: [],
    });
    const [mapLocation, setMapLocation] = useState({});

    const handleMapChange = (loc) => {
        setMapLocation(loc);
        setForm(prev => ({
            ...prev,
            address: loc.address || prev.address,
            city: loc.city || prev.city,
            district: loc.district || prev.district,
            latitude: loc.latitude || prev.latitude,
            longitude: loc.longitude || prev.longitude,
        }));
    };
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Field management
    const [showAddField, setShowAddField] = useState(false);
    const [fieldForm, setFieldForm] = useState({
        name: '', sportType: 'football', fieldType: 'STANDARD', capacity: 10,
    });
    const [fieldPricingRows, setFieldPricingRows] = useState([
        { label: 'Giờ thường', startTime: '06:00', endTime: '17:00', price: '' },
    ]);
    const [fieldError, setFieldError] = useState('');
    const [fieldSubmitting, setFieldSubmitting] = useState(false);

    // Edit venue
    const [editVenue, setEditVenue] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editMapLocation, setEditMapLocation] = useState({});
    const [editImageFiles, setEditImageFiles] = useState([]);
    const [editImagePreviews, setEditImagePreviews] = useState([]);
    const [editExistingImages, setEditExistingImages] = useState([]);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    // Edit field
    const [editingField, setEditingField] = useState(null);
    const [editFieldForm, setEditFieldForm] = useState({});

    // Pricing management
    const [showAddPricing, setShowAddPricing] = useState(null);
    const [pricingForm, setPricingForm] = useState({
        label: '', startTime: '06:00', endTime: '08:00', price: '',
    });
    const [editingPricing, setEditingPricing] = useState(null);
    const [editPricingForm, setEditPricingForm] = useState({});

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isOwner)) {
            router.push('/login');
            return;
        }
        if (isOwner) loadVenues();
    }, [isAuthenticated, isOwner, authLoading]);

    const loadVenues = async () => {
        try {
            const { data } = await venuesAPI.getMyVenues();
            setVenues(data.data.venues);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Image handling
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        setImageFiles(prev => [...prev, ...files]);
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target.result]);
            reader.readAsDataURL(f);
        });
    };
    const removeImage = (idx) => {
        setImageFiles(prev => prev.filter((_, i) => i !== idx));
        setImagePreviews(prev => prev.filter((_, i) => i !== idx));
    };

    // Create venue
    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            let imageUrls = [];
            if (imageFiles.length > 0) {
                const { data: uploadRes } = await uploadAPI.multiple(imageFiles);
                imageUrls = uploadRes.data.urls;
            }
            await venuesAPI.create({
                ...form,
                images: imageUrls,
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
            });
            setShowCreate(false);
            setForm({ name: '', phone: '', address: '', city: '', district: '', sportTypes: ['football'], description: '', openTime: '06:00', closeTime: '23:00', latitude: '', longitude: '', images: [] });
            setImageFiles([]);
            setImagePreviews([]);
            loadVenues();
        } catch (err) {
            setError(err.response?.data?.message || 'Tạo sân thất bại');
        } finally { setSubmitting(false); }
    };

    // Add field + pricing together
    const handleAddField = async (e) => {
        e.preventDefault();
        setFieldSubmitting(true);
        setFieldError('');
        try {
            const { data: fieldRes } = await fieldsAPI.create(showManage, {
                ...fieldForm,
                capacity: parseInt(fieldForm.capacity) || 10,
            });
            const newFieldId = fieldRes.data.field.id;
            // Add pricing rules
            for (const row of fieldPricingRows) {
                if (row.price) {
                    await fieldsAPI.createPricing(newFieldId, {
                        label: row.label,
                        startTime: row.startTime,
                        endTime: row.endTime,
                        price: parseFloat(row.price),
                    });
                }
            }
            setShowAddField(false);
            setFieldForm({ name: '', sportType: 'football', fieldType: 'SINGLE', capacity: 10 });
            setFieldPricingRows([{ label: 'Giờ thường', startTime: '06:00', endTime: '17:00', price: '' }]);
            loadVenues();
        } catch (err) {
            setFieldError(err.response?.data?.message || 'Thêm sân con thất bại');
        } finally { setFieldSubmitting(false); }
    };

    // Toggle field active
    const handleToggleField = async (fieldId, currentActive) => {
        try {
            await fieldsAPI.toggle(fieldId, !currentActive);
            loadVenues();
        } catch (err) { console.error(err); }
    };

    // Delete field
    const handleDeleteField = async (fieldId) => {
        if (!confirm('Bạn có chắc muốn xóa sân con này?')) return;
        try {
            await fieldsAPI.delete(fieldId);
            loadVenues();
        } catch (err) { alert(err.response?.data?.message || 'Xóa thất bại'); }
    };

    // Save edit field
    const handleSaveField = async (fieldId) => {
        try {
            await fieldsAPI.update(fieldId, {
                name: editFieldForm.name,
                sportType: editFieldForm.sportType,
                capacity: parseInt(editFieldForm.capacity) || 10,
            });
            setEditingField(null);
            loadVenues();
        } catch (err) { console.error(err); }
    };

    // Add pricing
    const handleAddPricing = async (e) => {
        e.preventDefault();
        try {
            await fieldsAPI.createPricing(showAddPricing, {
                ...pricingForm,
                price: parseFloat(pricingForm.price),
            });
            setShowAddPricing(null);
            setPricingForm({ label: '', startTime: '06:00', endTime: '08:00', price: '' });
            loadVenues();
        } catch (err) { alert(err.response?.data?.message || 'Thêm giá thất bại'); }
    };

    // Save edit pricing
    const handleSavePricing = async (ruleId) => {
        try {
            await fieldsAPI.updatePricing(ruleId, {
                label: editPricingForm.label,
                startTime: editPricingForm.startTime,
                endTime: editPricingForm.endTime,
                price: parseFloat(editPricingForm.price),
            });
            setEditingPricing(null);
            loadVenues();
        } catch (err) { console.error(err); }
    };

    // Delete pricing
    const handleDeletePricing = async (ruleId) => {
        if (!confirm('Xóa khung giá này?')) return;
        try {
            await fieldsAPI.deletePricing(ruleId);
            loadVenues();
        } catch (err) { alert(err.response?.data?.message || 'Xóa thất bại'); }
    };

    // Open edit venue form
    const handleOpenEdit = (venue) => {
        setEditVenue(venue);
        setEditForm({
            name: venue.name || '',
            phone: venue.phone || '',
            address: venue.address || '',
            city: venue.city || '',
            district: venue.district || '',
            sportTypes: Array.isArray(venue.sportTypes) ? venue.sportTypes : ['football'],
            description: venue.description || '',
            openTime: venue.openTime || '06:00',
            closeTime: venue.closeTime || '23:00',
            latitude: venue.latitude ? String(venue.latitude) : '',
            longitude: venue.longitude ? String(venue.longitude) : '',
        });
        setEditMapLocation({
            latitude: venue.latitude,
            longitude: venue.longitude,
            address: venue.address,
            city: venue.city,
            district: venue.district,
        });
        setEditExistingImages(Array.isArray(venue.images) ? [...venue.images] : []);
        setEditImageFiles([]);
        setEditImagePreviews([]);
        setEditError('');
    };

    const handleEditMapChange = (loc) => {
        setEditMapLocation(loc);
        setEditForm(prev => ({
            ...prev,
            address: loc.address || prev.address,
            city: loc.city || prev.city,
            district: loc.district || prev.district,
            latitude: loc.latitude || prev.latitude,
            longitude: loc.longitude || prev.longitude,
        }));
    };

    const handleEditImageSelect = (e) => {
        const files = Array.from(e.target.files);
        setEditImageFiles(prev => [...prev, ...files]);
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = (ev) => setEditImagePreviews(prev => [...prev, ev.target.result]);
            reader.readAsDataURL(f);
        });
    };

    const removeEditExistingImage = (idx) => {
        setEditExistingImages(prev => prev.filter((_, i) => i !== idx));
    };
    const removeEditNewImage = (idx) => {
        setEditImageFiles(prev => prev.filter((_, i) => i !== idx));
        setEditImagePreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitting(true);
        setEditError('');
        try {
            let newUrls = [];
            if (editImageFiles.length > 0) {
                const { data: uploadRes } = await uploadAPI.multiple(editImageFiles);
                newUrls = uploadRes.data.urls;
            }
            const finalImages = [...editExistingImages, ...newUrls];
            await venuesAPI.update(editVenue.id, {
                ...editForm,
                images: finalImages,
                latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
                longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
            });
            setEditVenue(null);
            loadVenues();
        } catch (err) {
            setEditError(err.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDeleteVenue = async (venueId, venueName) => {
        if (!confirm(`Bạn có chắc muốn xóa "${venueName}"?\nTất cả sân con và lịch sử liên quan sẽ bị xóa. Hành động này không thể hoàn tác.`)) return;
        try {
            await venuesAPI.delete(venueId);
            loadVenues();
        } catch (err) {
            alert(err.response?.data?.message || 'Xóa sân thất bại');
        }
    };

    const managedVenue = venues.find(v => v.id === showManage);

    // Status card/overlay classes removed — VenueCard handles status display

    return (
        <div className={styles.page}>
            <div className="container">
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý sân</h1>
                        <p className={styles.pageSubtitle}>Quản lý khu sân, sân con và bảng giá của bạn</p>
                    </div>
                    <div className={styles.pageHeaderActions}>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            + Tạo khu sân mới
                        </button>
                    </div>
                </div>

                {/* Summary bar */}
                {!loading && venues.length > 0 && (
                    <div className={styles.summaryBar}>
                        <div className={styles.summaryItem}>
                            <span style={{ fontSize: 16 }}>{getSportIcon('all')}</span> <strong>{venues.length}</strong> khu sân
                        </div>
                        <div className={styles.summaryItem}>
                            <CheckCircle2 size={16} color="#10B981" /> <strong>{venues.filter(v => v.status === 'APPROVED').length}</strong> hoạt động
                        </div>
                        <div className={styles.summaryItem}>
                            <Clock3 size={16} color="#F59E0B" /> <strong>{venues.filter(v => v.status === 'PENDING').length}</strong> chờ duyệt
                        </div>
                        <div className={styles.summaryItem}>
                            <span style={{ fontSize: 16 }}>{getSportIcon('football')}</span> <strong>{venues.reduce((s, v) => s + (v.fields?.length || 0), 0)}</strong> sân con
                        </div>
                    </div>
                )}

                {/* Venue list */}
                {loading ? (
                    <div className={venueCardStyles.grid}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={venueCardStyles.skeletonCard}>
                                <div className={venueCardStyles.skeletonImage} />
                                <div className={venueCardStyles.skeletonBody}>
                                    <div className={venueCardStyles.skeletonLine} style={{ width: '70%' }} />
                                    <div className={venueCardStyles.skeletonLine} style={{ width: '50%' }} />
                                    <div className={venueCardStyles.skeletonLine} style={{ width: '40%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : venues.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>{getSportIcon('all')}</div>
                        <div className="empty-state-title">Chưa có khu sân nào</div>
                        <div className="empty-state-text">Tạo khu sân đầu tiên để bắt đầu nhận khách</div>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Tạo khu sân →</button>
                    </div>
                ) : (
                    <div className={venueCardStyles.grid}>
                        {venues.map(venue => (
                            <VenueCard
                                key={venue.id}
                                venue={venue}
                                mode="owner"
                                onManage={(v) => setShowManage(v.id)}
                                onEdit={(v) => handleOpenEdit(v)}
                                onDelete={(v) => handleDeleteVenue(v.id, v.name)}
                            />
                        ))}
                    </div>
                )}

                {/* ===== CREATE VENUE MODAL ===== */}
                {showCreate && (
                    <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header">
                                <h2 className="heading-sm">Tạo khu sân mới</h2>
                                <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                            </div>

                            {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{error}</div>}

                            <form onSubmit={handleCreate}>
                                {/* Images */}
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={16} /> Ảnh khu sân</label>
                                    <div className={styles.imageUpload}>
                                        {imagePreviews.map((src, i) => (
                                            <div key={i} className={styles.imagePreviewItem}>
                                                <img src={src} alt="" />
                                                <button type="button" className={styles.imageRemove} onClick={() => removeImage(i)}>×</button>
                                            </div>
                                        ))}
                                        <label className={styles.imageAddBtn}>
                                            <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
                                            <span>+</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tên khu sân *</label>
                                    <input type="text" className="form-input" placeholder="Sân Bóng Đá ABC" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={16} /> SĐT liên hệ</label>
                                    <input type="tel" className="form-input" placeholder="0901234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                {/* Map Picker - Address */}
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} /> Chọn vị trí trên bản đồ *</label>
                                    <MapPicker
                                        value={mapLocation}
                                        onChange={handleMapChange}
                                        height={300}
                                    />
                                </div>

                                {/* Editable address fields (auto-filled from map) */}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label">Địa chỉ *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền từ bản đồ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Thành phố *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Quận/Huyện *</label>
                                        <input type="text" className="form-input" placeholder="Tự động điền" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Môn thể thao *</label>
                                    <div className={styles.sportChips}>
                                        {['football', 'badminton', 'tennis', 'basketball', 'volleyball', 'pickleball'].map((key) => (
                                            <button key={key} type="button"
                                                className={`${styles.sportChip} ${form.sportTypes.includes(key) ? styles.sportChipActive : ''}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                onClick={() => {
                                                    const types = form.sportTypes.includes(key)
                                                        ? form.sportTypes.filter(t => t !== key)
                                                        : [...form.sportTypes, key];
                                                    if (types.length > 0) setForm({ ...form, sportTypes: types });
                                                }}>
                                                <span style={{ fontSize: 16, display: 'flex', alignItems: 'center' }}>{getSportIcon(key)}</span> {getSportLabel(key)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Open/Close */}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Giờ mở cửa</label>
                                        <FormSelect
                                            value={form.openTime}
                                            onChange={(val) => setForm({ ...form, openTime: val })}
                                            options={Array.from({ length: 24 }, (_, i) => {
                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                return { value: t, label: t };
                                            })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Giờ đóng cửa</label>
                                        <FormSelect
                                            value={form.closeTime}
                                            onChange={(val) => setForm({ ...form, closeTime: val })}
                                            options={Array.from({ length: 24 }, (_, i) => {
                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                return { value: t, label: t };
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mô tả</label>
                                    <textarea className="form-input" placeholder="Giới thiệu về sân..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                                    {submitting ? <span className="spinner" /> : 'Gửi duyệt →'}
                                </button>
                                <p className="caption" style={{ textAlign: 'center', marginTop: 8 }}>
                                    Sau khi admin duyệt, bạn có thể thêm sân con và bảng giá
                                </p>
                            </form>
                        </div>
                    </div>
                )}

                {/* ===== EDIT VENUE MODAL ===== */}
                {editVenue && (
                    <div className="modal-overlay" onClick={() => setEditVenue(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
                            <div className="modal-header">
                                <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pencil size={20} /> Chỉnh sửa: {editVenue.name}</h2>
                                <button className="modal-close" onClick={() => setEditVenue(null)}>×</button>
                            </div>

                            {editError && (
                                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 14 }}>
                                    {editError}
                                </div>
                            )}

                            <form onSubmit={handleEditSubmit}>
                                {/* Image management */}
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={16} /> Ảnh khu sân</label>

                                    <div className={styles.imageUpload}>
                                        {/* Existing images */}
                                        {editExistingImages.map((url, i) => (
                                            <div key={i} className={styles.imagePreviewItem}>
                                                <img src={`${SERVER_URL}${url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" className={styles.imageRemove} onClick={() => removeEditExistingImage(i)}>×</button>
                                            </div>
                                        ))}

                                        {/* New images to upload */}
                                        {editImagePreviews.map((src, i) => (
                                            <div key={i} className={`${styles.imagePreviewItem} ${styles.imagePreviewNew}`}>
                                                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" className={styles.imageRemove} onClick={() => removeEditNewImage(i)}>×</button>
                                                <span className={styles.newBadge}>Mới</span>
                                            </div>
                                        ))}
                                        <label className={styles.imageAddBtn}>
                                            <input type="file" accept="image/*" multiple onChange={handleEditImageSelect} style={{ display: 'none' }} />
                                            <span>+</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tên khu sân *</label>
                                    <input type="text" className="form-input" value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={16} /> SĐT liên hệ</label>
                                    <input type="tel" className="form-input" value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} /> Cập nhật vị trí (tuỳ chọn)</label>
                                    <MapPicker value={editMapLocation} onChange={handleEditMapChange} height={260} />
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label">Địa chỉ *</label>
                                        <input type="text" className="form-input" value={editForm.address}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} required />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Thành phố *</label>
                                        <input type="text" className="form-input" value={editForm.city}
                                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Quận/Huyện *</label>
                                        <input type="text" className="form-input" value={editForm.district}
                                            onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} required />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Môn thể thao *</label>
                                    <div className={styles.sportChips}>
                                        {['football', 'badminton', 'tennis', 'basketball', 'volleyball', 'pickleball'].map((key) => (
                                            <button key={key} type="button"
                                                className={`${styles.sportChip} ${editForm.sportTypes?.includes(key) ? styles.sportChipActive : ''}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                onClick={() => {
                                                    const types = editForm.sportTypes?.includes(key)
                                                        ? editForm.sportTypes.filter(t => t !== key)
                                                        : [...(editForm.sportTypes || []), key];
                                                    if (types.length > 0) setEditForm({ ...editForm, sportTypes: types });
                                                }}>
                                                <span style={{ fontSize: 16, display: 'flex', alignItems: 'center' }}>{getSportIcon(key)}</span> {getSportLabel(key)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Giờ mở cửa</label>
                                        <FormSelect
                                            value={editForm.openTime}
                                            onChange={(val) => setEditForm({ ...editForm, openTime: val })}
                                            options={Array.from({ length: 24 }, (_, i) => {
                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                return { value: t, label: t };
                                            })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Giờ đóng cửa</label>
                                        <FormSelect
                                            value={editForm.closeTime}
                                            onChange={(val) => setEditForm({ ...editForm, closeTime: val })}
                                            options={Array.from({ length: 24 }, (_, i) => {
                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                return { value: t, label: t };
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mô tả</label>
                                    <textarea className="form-input" rows={3} value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditVenue(null)}>
                                        Huỷ
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={editSubmitting}>
                                        {editSubmitting ? <span className="spinner" /> : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ===== MANAGE VENUE MODAL ===== */}
                {showManage && managedVenue && (
                    <div className="modal-overlay" onClick={() => { setShowManage(null); setShowAddField(false); setShowAddPricing(null); setEditingField(null); setEditingPricing(null); }}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header">
                                <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20} /> {managedVenue.name}</h2>
                                <button className="modal-close" onClick={() => { setShowManage(null); setShowAddField(false); setShowAddPricing(null); }}>×</button>
                            </div>

                            <div className={styles.manageSummary}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {managedVenue.address}, {managedVenue.district}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {managedVenue.openTime} - {managedVenue.closeTime}</span>
                            </div>

                            {/* Fields */}
                            <div style={{ marginBottom: 16 }}>
                                <div className="flex-between" style={{ marginBottom: 12 }}>
                                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>Sân con ({managedVenue.fields?.length || 0})</h3>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddField(!showAddField)}>
                                        {showAddField ? 'Đóng' : '+ Thêm sân con'}
                                    </button>
                                </div>

                                {/* Add field form with inline pricing */}
                                {showAddField && (
                                    <div className={styles.inlineForm}>
                                        {fieldError && <div className="form-error" style={{ marginBottom: 8 }}>{fieldError}</div>}
                                        <form onSubmit={handleAddField}>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <div className="form-group" style={{ flex: 2 }}>
                                                    <label className="form-label">Tên sân *</label>
                                                    <input type="text" className="form-input" placeholder="Sân 5A..." value={fieldForm.name}
                                                        onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })} required />
                                                </div>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label className="form-label">Sức chứa</label>
                                                    <input type="number" className="form-input" min="2" max="50" value={fieldForm.capacity}
                                                        onChange={(e) => setFieldForm({ ...fieldForm, capacity: e.target.value })} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label className="form-label">Loại sân</label>
                                                    <FormSelect
                                                        value={fieldForm.fieldType}
                                                        onChange={(val) => setFieldForm({ ...fieldForm, fieldType: val })}
                                                        options={[
                                                            { value: 'STANDARD', label: 'Sân đơn' },
                                                            { value: 'COMBINED', label: 'Sân ghép' }
                                                        ]}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label className="form-label">Môn thể thao</label>
                                                    <FormSelect
                                                        value={fieldForm.sportType}
                                                        onChange={(val) => setFieldForm({ ...fieldForm, sportType: val })}
                                                        options={Object.entries(sportTypeLabels).map(([k, l]) => ({ value: k, label: l }))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Inline pricing rows */}
                                            <div style={{ marginTop: 8 }}>
                                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={16} /> Bảng giá</label>
                                                {fieldPricingRows.map((row, idx) => (
                                                    <div key={idx} className={styles.pricingInputRow}>
                                                        <input type="text" className="form-input" placeholder="Tên" value={row.label}
                                                            onChange={(e) => { const r = [...fieldPricingRows]; r[idx].label = e.target.value; setFieldPricingRows(r); }}
                                                            style={{ flex: 1.5 }} />
                                                        <FormSelect
                                                            className={styles.inlineDropdown}
                                                            value={row.startTime}
                                                            onChange={(val) => { const r = [...fieldPricingRows]; r[idx].startTime = val; setFieldPricingRows(r); }}
                                                            options={Array.from({ length: 24 }, (_, i) => {
                                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                                return { value: t, label: t };
                                                            })}
                                                        />
                                                        <span>→</span>
                                                        <FormSelect
                                                            className={styles.inlineDropdown}
                                                            value={row.endTime}
                                                            onChange={(val) => { const r = [...fieldPricingRows]; r[idx].endTime = val; setFieldPricingRows(r); }}
                                                            options={Array.from({ length: 24 }, (_, i) => {
                                                                const t = `${String(i).padStart(2, '0')}:00`;
                                                                return { value: t, label: t };
                                                            })}
                                                        />
                                                        <input type="number" className="form-input" placeholder="VNĐ/h" value={row.price}
                                                            onChange={(e) => { const r = [...fieldPricingRows]; r[idx].price = e.target.value; setFieldPricingRows(r); }}
                                                            style={{ flex: 1.2 }} />
                                                        {fieldPricingRows.length > 1 && (
                                                            <button type="button" className={styles.removeBtn}
                                                                onClick={() => setFieldPricingRows(fieldPricingRows.filter((_, i) => i !== idx))}>×</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button type="button" className="btn btn-ghost btn-sm"
                                                    onClick={() => setFieldPricingRows([...fieldPricingRows, { label: '', startTime: '06:00', endTime: '08:00', price: '' }])}>
                                                    + Thêm khung giá
                                                </button>
                                            </div>

                                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} disabled={fieldSubmitting}>
                                                {fieldSubmitting ? <span className="spinner" /> : 'Tạo sân con'}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Existing fields */}
                                {managedVenue.fields?.length === 0 ? (
                                    <div className={styles.emptyFields}>
                                        <ClipboardList size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                                        <div>Chưa có sân con. Thêm sân con để bắt đầu nhận đặt.</div>
                                    </div>
                                ) : (
                                    <div className={styles.fieldsList}>
                                        {managedVenue.fields?.map(field => (
                                            <div key={field.id} className={`${styles.fieldItem} ${!field.isActive ? styles.fieldItemInactive : ''}`}>
                                                <div className={styles.fieldItemHeader}>
                                                    {editingField === field.id ? (
                                                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                                            <input className="form-input" value={editFieldForm.name} style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                                                                onChange={(e) => setEditFieldForm({ ...editFieldForm, name: e.target.value })} />
                                                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveField(field.id)} style={{ padding: '4px 8px' }}><Save size={16} /></button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingField(null)} style={{ padding: '4px 8px' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div style={{ flex: 1 }}>
                                                                <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontSize: 16 }}>{field.isActive ? getSportIcon(field.sportType) : <Pause size={16} />}</span>
                                                                    {field.name}
                                                                </strong>
                                                                <span className="caption"> • {getSportLabel(field.sportType)} • {field.capacity || '?'}p</span>
                                                            </div>
                                                            <div className={styles.fieldActions}>
                                                                {/* Toggle */}
                                                                <button className={`${styles.toggleBtn} ${field.isActive ? styles.toggleActive : ''}`}
                                                                    onClick={() => handleToggleField(field.id, field.isActive)}
                                                                    title={field.isActive ? 'Tắt hoạt động' : 'Bật hoạt động'}>
                                                                    <span className={styles.toggleDot} />
                                                                </button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingField(field.id); setEditFieldForm({ name: field.name, sportType: field.sportType, capacity: field.capacity }); }}><Pencil size={16} /></button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteField(field.id)}><Trash2 size={16} /></button>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPricing(showAddPricing === field.id ? null : field.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>+ <CircleDollarSign size={16} /></button>
                                                                <button className="btn btn-primary btn-sm"
                                                                    title="Cấu hình bảng giá nâng cao"
                                                                    onClick={() => router.push(`/owner/pricing/${field.id}?name=${encodeURIComponent(field.name)}&venue=${encodeURIComponent(managedVenue.name)}&venueId=${managedVenue.id}&sport=${field.sportType}`)}>
                                                                    <BarChart2 size={16} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Pricing */}
                                                {field.pricingRules?.length > 0 && (
                                                    <div className={styles.pricingList}>
                                                        {field.pricingRules.map(rule => (
                                                            <div key={rule.id} className={styles.pricingRow}>
                                                                {editingPricing === rule.id ? (
                                                                    <div className={styles.pricingEditRow}>
                                                                        <input className="form-input" value={editPricingForm.label} placeholder="Tên" style={{ flex: 1, padding: '3px 6px', fontSize: 12 }}
                                                                            onChange={(e) => setEditPricingForm({ ...editPricingForm, label: e.target.value })} />
                                                                        <input className="form-input" value={editPricingForm.startTime} style={{ width: 60, padding: '3px 6px', fontSize: 12 }}
                                                                            onChange={(e) => setEditPricingForm({ ...editPricingForm, startTime: e.target.value })} />
                                                                        <span>→</span>
                                                                        <input className="form-input" value={editPricingForm.endTime} style={{ width: 60, padding: '3px 6px', fontSize: 12 }}
                                                                            onChange={(e) => setEditPricingForm({ ...editPricingForm, endTime: e.target.value })} />
                                                                        <input className="form-input" type="number" value={editPricingForm.price} style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
                                                                            onChange={(e) => setEditPricingForm({ ...editPricingForm, price: e.target.value })} />
                                                                        <button className="btn btn-primary btn-sm" onClick={() => handleSavePricing(rule.id)} style={{ padding: '4px 8px' }}><Save size={14} /></button>
                                                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingPricing(null)} style={{ padding: '4px 8px' }}>✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span>{rule.label || 'Khung giờ'}</span>
                                                                        <span className="caption">{rule.startTime} - {rule.endTime}</span>
                                                                        <strong style={{ color: 'var(--primary)' }}>{Number(rule.price).toLocaleString('vi-VN')}đ/h</strong>
                                                                        <div style={{ display: 'flex', gap: 2 }}>
                                                                            <button className={styles.miniBtn} onClick={() => { setEditingPricing(rule.id); setEditPricingForm({ label: rule.label || '', startTime: rule.startTime, endTime: rule.endTime, price: Number(rule.price) }); }}><Pencil size={14} /></button>
                                                                            <button className={styles.miniBtn} onClick={() => handleDeletePricing(rule.id)}><Trash2 size={14} /></button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add pricing inline */}
                                                {showAddPricing === field.id && (
                                                    <form onSubmit={handleAddPricing} className={styles.inlineForm} style={{ marginTop: 8, padding: 12 }}>
                                                        <div className={styles.pricingInputRow}>
                                                            <input type="text" className="form-input" placeholder="Tên khung" value={pricingForm.label}
                                                                onChange={(e) => setPricingForm({ ...pricingForm, label: e.target.value })} style={{ flex: 1.5 }} />
                                                            <FormSelect
                                                                className={styles.inlineDropdown}
                                                                value={pricingForm.startTime}
                                                                onChange={(val) => setPricingForm({ ...pricingForm, startTime: val })}
                                                                options={Array.from({ length: 24 }, (_, i) => {
                                                                    const t = `${String(i).padStart(2, '0')}:00`;
                                                                    return { value: t, label: t };
                                                                })}
                                                            />
                                                            <span>→</span>
                                                            <FormSelect
                                                                className={styles.inlineDropdown}
                                                                value={pricingForm.endTime}
                                                                onChange={(val) => setPricingForm({ ...pricingForm, endTime: val })}
                                                                options={Array.from({ length: 24 }, (_, i) => {
                                                                    const t = `${String(i).padStart(2, '0')}:00`;
                                                                    return { value: t, label: t };
                                                                })}
                                                            />
                                                            <input type="number" className="form-input" placeholder="VNĐ/h" value={pricingForm.price}
                                                                onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })} style={{ flex: 1.2 }} required />
                                                            <button type="submit" className="btn btn-primary btn-sm">Thêm</button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
