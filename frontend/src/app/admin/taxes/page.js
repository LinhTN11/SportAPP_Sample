'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { taxAPI, adminAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from '../dashboard/dashboard.module.css';
import {
    FileText,
    Download,
    AlertCircle,
    CheckCircle2,
    X,
    Plus,
    Calendar,
    Search,
    RefreshCcw,
    User,
    Pencil,
    Save,
    ShieldCheck,
} from 'lucide-react';

export default function AdminTaxesPage() {
    const router = useRouter();
    const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Preview modal state
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Edit tax info modal state (per owner)
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ taxCode: '', address: '' });
    const [isSavingTax, setIsSavingTax] = useState(false);
    const [taxSaveMsg, setTaxSaveMsg] = useState('');

    // Platform settings state
    const [platformSettings, setPlatformSettings] = useState({ platformName: '', taxCode: '', address: '', representative: '' });
    const [isEditingPlatform, setIsEditingPlatform] = useState(false);
    const [isSavingPlatform, setIsSavingPlatform] = useState(false);
    const [platformSaveMsg, setPlatformSaveMsg] = useState('');

    // Form for generation
    const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
    const [genYear, setGenYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isAdmin)) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, isAdmin, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchVouchers();
            fetchPlatformSettings();
        }
    }, [isAdmin]);

    const fetchPlatformSettings = async () => {
        try {
            const { data } = await adminAPI.getPlatformSettings();
            setPlatformSettings(data.data);
        } catch (err) {
            console.error('Fetch platform settings error:', err);
        }
    };

    const handleSavePlatform = async () => {
        try {
            setIsSavingPlatform(true);
            const { data } = await adminAPI.updatePlatformSettings(platformSettings);
            setPlatformSettings(data.data);
            setPlatformSaveMsg('Đã lưu thông tin nền tảng thành công!');
            setIsEditingPlatform(false);
            setTimeout(() => setPlatformSaveMsg(''), 3000);
        } catch (err) {
            console.error('Save platform settings error:', err);
            setPlatformSaveMsg('Lỗi khi lưu. Vui lòng thử lại.');
        } finally {
            setIsSavingPlatform(false);
        }
    };

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const { data } = await taxAPI.getAllAdminVouchers();
            setVouchers(data.data || []);
        } catch (err) {
            console.error('Fetch admin vouchers error:', err);
            setError('Không thể tải danh sách chứng từ thuế hệ thống.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            setIsGenerating(true);
            const { data } = await taxAPI.generateVouchers({ month: genMonth, year: genYear });
            alert(`Thành công: ${data.message}`);
            setShowGenerateModal(false);
            fetchVouchers();
        } catch (err) {
            console.error('Generate error:', err);
            alert(err.response?.data?.message || 'Lỗi khi tạo chứng từ.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreview = async (id) => {
        try {
            setIsPreviewLoading(true);
            const { data } = await taxAPI.getExport(id);
            setPreviewHtml(data.data.html);
            setSelectedVoucher(data.data.voucher);
        } catch (err) {
            console.error('Preview error:', err);
            alert('Không thể tải bản xem trước chứng từ.');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Chứng từ khấu trừ thuế TNCN - ${selectedVoucher.voucherNumber}</title>
                    <style>
                        @media print { body { margin: 0; } button { display: none; } }
                    </style>
                </head>
                <body>
                    ${previewHtml}
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">In chứng từ</button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const openEditTax = (v) => {
        setEditTarget({ ownerId: v.owner.id, ownerName: v.owner.fullName });
        setEditForm({ taxCode: v.owner.taxCode || '', address: v.owner.address || '' });
        setTaxSaveMsg('');
    };

    const handleSaveTaxInfo = async () => {
        try {
            setIsSavingTax(true);
            await adminAPI.updateUserTaxInfo(editTarget.ownerId, editForm);
            setTaxSaveMsg('Đã lưu thành công!');
            // Update the local vouchers list
            setVouchers(prev => prev.map(v =>
                v.owner.id === editTarget.ownerId
                    ? { ...v, owner: { ...v.owner, taxCode: editForm.taxCode, address: editForm.address } }
                    : v
            ));
            setTimeout(() => {
                setEditTarget(null);
                setTaxSaveMsg('');
            }, 1200);
        } catch (err) {
            console.error('Save tax info error:', err);
            setTaxSaveMsg('Lỗi khi lưu. Vui lòng thử lại.');
        } finally {
            setIsSavingTax(false);
        }
    };

    const filteredVouchers = vouchers.filter(v =>
        v.owner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const missingTaxCount = vouchers.filter(v => !v.owner?.taxCode || !v.owner?.address).length;

    if (authLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingOverlay}>
                    <RefreshCcw className="spinner" size={40} style={{ color: '#3b82f6' }} />
                    <p>Đang tải dữ liệu thuế hệ thống...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container">
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Quản lý Thuế &amp; Chứng từ</h1>
                        <p className={styles.subtitle}>
                            Phát hành chứng từ khấu trừ thuế TNCN cho các chủ sân
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className={styles.panelAction}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none' }}
                        >
                            <Plus size={20} /> Phát hành chứng từ tháng
                        </button>
                    </div>
                </header>

                {error && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* ── Platform Settings Panel ── */}
                <div className={styles.panel} style={{ marginBottom: '28px' }}>
                    <div className={styles.panelHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} color="#3b82f6" />
                            <h2 className={styles.panelTitle} style={{ margin: 0 }}>Thông tin nền tảng (Tổ chức trả thu nhập)</h2>
                            <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '2px 10px', borderRadius: '20px', fontWeight: 600 }}>Mục I trong chứng từ</span>
                        </div>
                        {!isEditingPlatform && (
                            <button
                                onClick={() => setIsEditingPlatform(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569' }}
                            >
                                <Pencil size={14} /> Chỉnh sửa
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '24px' }}>
                        {platformSaveMsg && (
                            <div style={{ backgroundColor: platformSaveMsg.includes('Lỗi') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${platformSaveMsg.includes('Lỗi') ? '#fca5a5' : '#86efac'}`, color: platformSaveMsg.includes('Lỗi') ? '#dc2626' : '#15803d', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <CheckCircle2 size={16} /> {platformSaveMsg}
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Tên nền tảng */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tên tổ chức <span style={{ color: '#ef4444' }}>*</span></label>
                                {isEditingPlatform ? (
                                    <input type="text" value={platformSettings.platformName} onChange={e => setPlatformSettings(p => ({ ...p, platformName: e.target.value }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '2px solid #3b82f6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                                ) : (
                                    <div style={{ padding: '11px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px', color: platformSettings.platformName ? '#0f172a' : '#94a3b8', fontStyle: platformSettings.platformName ? 'normal' : 'italic' }}>{platformSettings.platformName || 'Chưa cập nhật'}</div>
                                )}
                            </div>
                            {/* MST nền tảng */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mã số thuế nền tảng <span style={{ color: '#ef4444' }}>*</span></label>
                                {isEditingPlatform ? (
                                    <input type="text" value={platformSettings.taxCode} onChange={e => setPlatformSettings(p => ({ ...p, taxCode: e.target.value }))} placeholder="VD: 0101234567" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `2px solid ${platformSettings.taxCode ? '#3b82f6' : '#fed7aa'}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px' }} />
                                ) : (
                                    <div style={{ padding: '11px 14px', borderRadius: '10px', background: '#f8fafc', border: `1px solid ${platformSettings.taxCode ? '#e2e8f0' : '#fca5a5'}`, fontSize: '14px', fontFamily: 'monospace', letterSpacing: '1px', color: platformSettings.taxCode ? '#0f172a' : '#dc2626', fontStyle: platformSettings.taxCode ? 'normal' : 'italic' }}>{platformSettings.taxCode || '⚠ Chưa cập nhật'}</div>
                                )}
                            </div>
                            {/* Người đại diện */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Người đại diện ký</label>
                                {isEditingPlatform ? (
                                    <input type="text" value={platformSettings.representative} onChange={e => setPlatformSettings(p => ({ ...p, representative: e.target.value }))} placeholder="VD: Nguyễn Văn A - Giám đốc" style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '2px solid #3b82f6', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                                ) : (
                                    <div style={{ padding: '11px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px', color: platformSettings.representative ? '#0f172a' : '#94a3b8', fontStyle: platformSettings.representative ? 'normal' : 'italic' }}>{platformSettings.representative || 'Chưa cập nhật'}</div>
                                )}
                            </div>
                            {/* Địa chỉ */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Địa chỉ nền tảng <span style={{ color: '#ef4444' }}>*</span></label>
                                {isEditingPlatform ? (
                                    <textarea value={platformSettings.address} onChange={e => setPlatformSettings(p => ({ ...p, address: e.target.value }))} placeholder="VD: Tòa nhà Landmark 81, TP. Hồ Chí Minh" rows={2} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `2px solid ${platformSettings.address ? '#3b82f6' : '#fed7aa'}`, fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                ) : (
                                    <div style={{ padding: '11px 14px', borderRadius: '10px', background: '#f8fafc', border: `1px solid ${platformSettings.address ? '#e2e8f0' : '#fca5a5'}`, fontSize: '14px', color: platformSettings.address ? '#0f172a' : '#dc2626', fontStyle: platformSettings.address ? 'normal' : 'italic', minHeight: '48px' }}>{platformSettings.address || '⚠ Chưa cập nhật'}</div>
                                )}
                            </div>
                        </div>

                        {isEditingPlatform && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                <button onClick={() => { setIsEditingPlatform(false); fetchPlatformSettings(); }} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Hủy</button>
                                <button onClick={handleSavePlatform} disabled={isSavingPlatform} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: isSavingPlatform ? 0.7 : 1 }}>
                                    {isSavingPlatform ? <RefreshCcw size={16} className="spinner" /> : <Save size={16} />}
                                    {isSavingPlatform ? 'Đang lưu...' : 'Lưu thông tin nền tảng'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning banner nếu có owner chưa điền MST */}
                {missingTaxCount > 0 && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={20} style={{ flexShrink: 0 }} />
                        <span>
                            Có <strong>{missingTaxCount}</strong> chủ sân chưa cập nhật đầy đủ thông tin thuế (MST/địa chỉ). Chứng từ của họ sẽ không có giá trị pháp lý đầy đủ. Nhấn <strong>Cập nhật thuế</strong> ở mỗi dòng để điền thông tin.
                        </span>
                    </div>
                )}

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Tất cả chứng từ đã phát hành</h2>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Tìm theo tên chủ sân, số chứng từ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                            />
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Kỳ thuế</th>
                                    <th>Chủ sân</th>
                                    <th>Số chứng từ</th>
                                    <th style={{ textAlign: 'right' }}>Tổng thu nhập</th>
                                    <th style={{ textAlign: 'right' }}>Thuế GTGT (5%)</th>
                                    <th style={{ textAlign: 'right' }}>Thuế TNCN (2%)</th>
                                    <th style={{ textAlign: 'center' }}>Ngày phát hành</th>
                                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            Không tìm thấy chứng từ nào.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((v) => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 700 }}>{v.periodMonth}/{v.periodYear}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={styles.avatar} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{v.owner.fullName}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{v.owner.phone}</div>
                                                        {v.owner.taxCode
                                                            ? <div style={{ fontSize: '11px', color: '#16a34a', fontFamily: 'monospace' }}>✓ MST: {v.owner.taxCode}</div>
                                                            : <div style={{ fontSize: '11px', color: '#dc2626' }}>⚠ Chưa có mã số thuế</div>
                                                        }
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '13px', color: '#64748b' }}>{v.voucherNumber}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(v.totalIncome).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ textAlign: 'right', color: '#f97316', fontWeight: 600 }}>{Number(v.vatWithheld).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{Number(v.pitWithheld).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ textAlign: 'center', fontSize: '13px' }}>{new Date(v.issueDate).toLocaleDateString('vi-VN')}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => openEditTax(v)}
                                                        title="Cập nhật thông tin thuế chủ sân"
                                                        style={{ background: 'none', border: `1px solid ${v.owner.taxCode ? '#e2e8f0' : '#fca5a5'}`, padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: v.owner.taxCode ? '#475569' : '#dc2626', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Pencil size={12} /> Thuế
                                                    </button>
                                                    <button
                                                        onClick={() => handlePreview(v.id)}
                                                        disabled={isPreviewLoading}
                                                        style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Download size={12} /> Chi tiết
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Edit Tax Info Modal ── */}
            {editTarget && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck size={22} color="#3b82f6" />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Cập nhật thông tin thuế</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{editTarget.ownerName}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {taxSaveMsg && (
                            <div style={{ backgroundColor: taxSaveMsg.includes('Lỗi') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${taxSaveMsg.includes('Lỗi') ? '#fca5a5' : '#86efac'}`, color: taxSaveMsg.includes('Lỗi') ? '#dc2626' : '#15803d', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                <CheckCircle2 size={16} /> {taxSaveMsg}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Mã số thuế cá nhân / doanh nghiệp <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={editForm.taxCode}
                                onChange={(e) => setEditForm(f => ({ ...f, taxCode: e.target.value }))}
                                placeholder="VD: 8123456789"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `2px solid ${editForm.taxCode ? '#3b82f6' : '#fed7aa'}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px' }}
                            />
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                Mã số thuế 10 chữ số theo đăng ký với cơ quan thuế.
                            </p>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Địa chỉ đăng ký thuế <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                value={editForm.address}
                                onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                                placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                                rows={3}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `2px solid ${editForm.address ? '#3b82f6' : '#fed7aa'}`, fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setEditTarget(null)}
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveTaxInfo}
                                disabled={isSavingTax}
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', opacity: isSavingTax ? 0.7 : 1 }}
                            >
                                {isSavingTax ? <RefreshCcw size={16} className="spinner" /> : <Save size={16} />}
                                {isSavingTax ? 'Đang lưu...' : 'Lưu thông tin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Voucher Preview Modal ── */}
            {selectedVoucher && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: 'auto' }}>
                        <div style={{ padding: '20px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Xem trước chứng từ điện tử</h3>
                            <button onClick={() => setSelectedVoucher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', backgroundColor: '#f8fafc' }}>
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
                        </div>
                        <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setSelectedVoucher(null)}
                                style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handlePrint}
                                style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Download size={18} /> In chứng từ điện tử
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Generate Modal ── */}
            {showGenerateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '450px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Phát hành chứng từ</h3>
                            <button onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleGenerate}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Chọn tháng</label>
                                <select
                                    value={genMonth}
                                    onChange={(e) => setGenMonth(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Chọn năm</label>
                                <select
                                    value={genYear}
                                    onChange={(e) => setGenYear(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px' }}
                                >
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateModal(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isGenerating}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {isGenerating ? <RefreshCcw size={18} className="spinner" /> : <Calendar size={18} />}
                                    {isGenerating ? 'Đang xử lý...' : 'Phát hành ngay'}
                                </button>
                            </div>
                            <p style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                                Hệ thống sẽ tính toán doanh thu từ các đơn đặt sân đã <b>Hoàn thành</b> trong tháng được chọn để tạo chứng từ khấu trừ thuế.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
