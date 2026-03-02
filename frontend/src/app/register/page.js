'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
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
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <h1 className={styles.authTitle}>Tạo tài khoản</h1>
                    <p className={styles.authSubtitle}>Tham gia SportApp ngay hôm nay</p>
                </div>

                {/* Role selector */}
                <div className={styles.roleSelector}>
                    <button
                        type="button"
                        className={`${styles.roleOption} ${form.role === 'CUSTOMER' ? styles.selected : ''}`}
                        onClick={() => setForm({ ...form, role: 'CUSTOMER' })}
                    >
                        <span className={styles.roleIcon}>👤</span>
                        <span className={styles.roleLabel}>Khách hàng</span>
                        <span className={styles.roleDesc}>Đặt sân & ghép trận</span>
                    </button>
                    <button
                        type="button"
                        className={`${styles.roleOption} ${form.role === 'OWNER' ? styles.selected : ''}`}
                        onClick={() => setForm({ ...form, role: 'OWNER' })}
                    >
                        <span className={styles.roleIcon}>🏠</span>
                        <span className={styles.roleLabel}>Chủ sân</span>
                        <span className={styles.roleDesc}>Quản lý & cho thuê sân</span>
                    </button>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Họ và tên</label>
                        <input
                            id="register-name"
                            type="text"
                            className="form-input"
                            placeholder="Nguyễn Văn A"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            id="register-email"
                            type="email"
                            className="form-input"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Số điện thoại</label>
                        <input
                            id="register-phone"
                            type="tel"
                            className="form-input"
                            placeholder="0901234567"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mật khẩu</label>
                        <input
                            id="register-password"
                            type="password"
                            className="form-input"
                            placeholder="Tối thiểu 6 ký tự"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        id="register-submit"
                        type="submit"
                        className={`btn btn-primary ${styles.authBtn}`}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Đăng ký'}
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
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner spinner-lg" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}
