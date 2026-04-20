'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { taxAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from '../dashboard/dashboard.module.css';
import {
    FileText, Download, AlertCircle, CheckCircle2, X,
    ShieldCheck, Save, Pencil
} from 'lucide-react';

export default function OwnerTaxesPage() {
    const router = useRouter();
    const { user, isAuthenticated, isOwner, loading: authLoading } = useAuth();

    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Tax profile state
    const [taxProfile, setTaxProfile] = useState({ taxCode: '', address: '' });
    const [isEditingTax, setIsEditingTax] = useState(false);
    const [isSavingTax, setIsSavingTax] = useState(false);
    const [taxSaveMsg, setTaxSaveMsg] = useState('');

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !isOwner)) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, isOwner, router]);

    useEffect(() => {
        if (isOwner) {
            fetchVouchers();
            fetchTaxProfile();
        }
    }, [isOwner]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const { data } = await taxAPI.getVouchers();
            setVouchers(data.data || []);
        } catch (err) {
            console.error('Fetch vouchers error:', err);
            setError('Không thể tải danh sách chứng từ thuế.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTaxProfile = async () => {
        try {
            const { data } = await usersAPI.getProfile();
            const u = data.data.user;
            setTaxProfile({ taxCode: u.taxCode || '', address: u.address || '' });
        } catch (err) {
            console.error('Fetch profile error:', err);
        }
    };

    const handleSaveTaxProfile = async () => {
        try {
            setIsSavingTax(true);
            await usersAPI.updateTaxInfo({ taxCode: taxProfile.taxCode, address: taxProfile.address });
            setTaxSaveMsg('Đã lưu thông tin thuế thành công!');
            setIsEditingTax(false);
            setTimeout(() => setTaxSaveMsg(''), 3000);
        } catch (err) {
            console.error('Save tax profile error:', err);
            setTaxSaveMsg('Lỗi khi lưu. Vui lòng thử lại.');
        } finally {
            setIsSavingTax(false);
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
                        <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            In chứng từ
                        </button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (authLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container} style={{ textAlign: 'center', paddingTop: '100px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '20px', color: '#64748b' }}>Đang tải dữ liệu thuế...</p>
                </div>
            </div>
        );
    }

    const hasMissingTaxInfo = !taxProfile.taxCode || !taxProfile.address;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <header style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        Thuế &amp; Chứng từ khấu trừ
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>
                        Quản lý các loại thuế đã khấu trừ và xuất chứng từ điện tử theo Nghị định 123/2020/NĐ-CP
                    </p>
                </header>

                {error && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Tax Info Warning Banner */}
                {hasMissingTaxInfo && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={20} style={{ flexShrink: 0 }} />
                        <span>
                            <strong>Thông tin thuế chưa đầy đủ.</strong> Vui lòng điền <strong>Mã số thuế</strong> và <strong>Địa chỉ</strong> trong phần bên dưới để chứng từ điện tử có giá trị pháp lý đầy đủ.
                        </span>
                    </div>
                )}

                {/* ── Tax Profile Settings Panel ── */}
                <div className={styles.panel} style={{ marginBottom: '28px' }}>
                    <div className={styles.panelHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} color="#3b82f6" />
                            <h2 className={styles.panelTitle} style={{ margin: 0 }}>Cài đặt thông tin thuế</h2>
                        </div>
                        {!isEditingTax && (
                            <button
                                onClick={() => setIsEditingTax(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569' }}
                            >
                                <Pencil size={14} /> Chỉnh sửa
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '24px' }}>
                        {taxSaveMsg && (
                            <div style={{ backgroundColor: taxSaveMsg.includes('Lỗi') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${taxSaveMsg.includes('Lỗi') ? '#fca5a5' : '#86efac'}`, color: taxSaveMsg.includes('Lỗi') ? '#dc2626' : '#15803d', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} /> {taxSaveMsg}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Mã số thuế */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Mã số thuế cá nhân / doanh nghiệp <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                {isEditingTax ? (
                                    <input
                                        type="text"
                                        value={taxProfile.taxCode}
                                        onChange={(e) => setTaxProfile(p => ({ ...p, taxCode: e.target.value }))}
                                        placeholder="VD: 8123456789"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `2px solid ${taxProfile.taxCode ? '#3b82f6' : '#fed7aa'}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '1px' }}
                                    />
                                ) : (
                                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '15px', fontFamily: 'monospace', letterSpacing: '1px', color: taxProfile.taxCode ? '#0f172a' : '#94a3b8', fontStyle: taxProfile.taxCode ? 'normal' : 'italic' }}>
                                        {taxProfile.taxCode || 'Chưa cập nhật'}
                                    </div>
                                )}
                            </div>

                            {/* SĐT */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Họ và tên đăng ký thuế
                                </label>
                                <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '15px', color: '#0f172a' }}>
                                    {user?.fullName || '—'}
                                </div>
                            </div>

                            {/* Địa chỉ full width */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Địa chỉ đăng ký thuế <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                {isEditingTax ? (
                                    <textarea
                                        value={taxProfile.address}
                                        onChange={(e) => setTaxProfile(p => ({ ...p, address: e.target.value }))}
                                        placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                                        rows={3}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `2px solid ${taxProfile.address ? '#3b82f6' : '#fed7aa'}`, fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                ) : (
                                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px', color: taxProfile.address ? '#0f172a' : '#94a3b8', fontStyle: taxProfile.address ? 'normal' : 'italic', minHeight: '60px' }}>
                                        {taxProfile.address || 'Chưa cập nhật'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isEditingTax && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={() => { setIsEditingTax(false); fetchTaxProfile(); }}
                                    style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSaveTaxProfile}
                                    disabled={isSavingTax}
                                    style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: isSavingTax ? 0.7 : 1 }}
                                >
                                    <Save size={16} /> {isSavingTax ? 'Đang lưu...' : 'Lưu thông tin'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Voucher List Panel ── */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Danh sách chứng từ tháng</h2>
                    </div>

                    {vouchers.length === 0 ? (
                        <div className={styles.emptyPanel}>
                            <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                            <p>Chưa có chứng từ thuế nào được phát hành.</p>
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Chứng từ thường được phát hành vào đầu mỗi tháng cho doanh thu tháng trước.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '16px 20px' }}>Kỳ tính thuế</th>
                                        <th style={{ padding: '16px 20px' }}>Số chứng từ</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right' }}>Tổng doanh thu</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right' }}>Thuế GTGT (5%)</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right' }}>Thuế TNCN (2%)</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center' }}>Trạng thái</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchers.map((v) => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px 20px', fontWeight: 600 }}>Tháng {v.periodMonth}/{v.periodYear}</td>
                                            <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748b' }}>{v.voucherNumber}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 500 }}>{Number(v.totalIncome).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right', color: '#f97316', fontWeight: 600 }}>-{Number(v.vatWithheld).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>-{Number(v.pitWithheld).toLocaleString('vi-VN')}đ</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle2 size={12} /> Đã phát hành
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handlePreview(v.id)}
                                                    disabled={isPreviewLoading}
                                                    style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: 500 }}
                                                >
                                                    <Download size={14} /> Xem &amp; In
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#eff6ff', borderRadius: '16px', border: '1px solid #dbeafe' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> Lưu ý về thuế
                    </h3>
                    <ul style={{ color: '#1e40af', fontSize: '14px', paddingLeft: '20px', margin: 0 }}>
                        <li style={{ marginBottom: '6px' }}>Theo Thông tư 18/2026/TT-BTC, Sàn SportApp có trách nhiệm khấu trừ thuế GTGT (5%) và TNCN (2%) trên doanh thu của Hộ kinh doanh.</li>
                        <li style={{ marginBottom: '6px' }}>Chứng từ điện tử này có giá trị pháp lý thay thế chứng từ giấy để anh/chị thực hiện quyết toán thuế cuối năm.</li>
                        <li>Dữ liệu được cập nhật hàng tháng dựa trên các đơn đặt sân đã trạng thái <b>Hoàn thành</b>.</li>
                    </ul>
                </div>
            </div>

            {/* Preview Modal */}
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
        </div>
    );
}
