'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { User, Home, AlertTriangle } from 'lucide-react';
import styles from '../login/auth.module.css';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();

    const defaultRole = searchParams.get('role') === 'owner' ? 'OWNER' : 'CUSTOMER';
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: defaultRole,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await register(form);
            if (user.role === 'OWNER') router.push('/owner/venues');
            else router.push('/venues');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authBackground}>
                <div className={styles.gradientOrb1}></div>
                <div className={styles.gradientOrb2}></div>
            </div>

            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <h1 className={styles.authLogo}>SportBooking</h1>
                    <h2 className={styles.authTitle}>Tạo tài khoản</h2>
                    <p className={styles.authSubtitle}>Tham gia SportBooking ngay hôm nay</p>
                </div>

                {/* Role selector */}
                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={`${styles.roleOption} ${form.role === 'CUSTOMER' ? styles.selected : ''}`}
                        onClick={() => setForm({ ...form, role: 'CUSTOMER' })}
                    >
                        <span className={styles.roleIcon}><User size={24} /></span>
                        <span className={styles.roleLabel}>Khách hàng</span>
                        <span className={styles.roleDesc}>Đặt sân & ghép trận</span>
                    </button>
                    <button
                        type="button"
                        className={`${styles.roleOption} ${form.role === 'OWNER' ? styles.selected : ''}`}
                        onClick={() => setForm({ ...form, role: 'OWNER' })}
                    >
                        <span className={styles.roleIcon}><Home size={24} /></span>
                        <span className={styles.roleLabel}>Chủ sân</span>
                        <span className={styles.roleDesc}>Quản lý & cho thuê sân</span>
                    </button>
                </div>

                {error && (
                    <div className={styles.errorBox}>
                        <span className={styles.errorIcon}><AlertTriangle size={18} /></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Họ và tên</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Nguyễn Văn A"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input
                            type="email"
                            className={styles.formInput}
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Số điện thoại</label>
                        <input
                            type="tel"
                            className={styles.formInput}
                            placeholder="0901234567"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mật khẩu</label>
                        <input
                            type="password"
                            className={styles.formInput}
                            placeholder="Tối thiểu 6 ký tự"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className={styles.authBtn} disabled={loading}>
                        {loading ? <span className={styles.spinner}></span> : 'Đăng ký'}
                    </button>
                </form>

                <p className={styles.authSwitch}>
                    Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className={styles.spinner} style={{ width: '40px', height: '40px' }}></div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}