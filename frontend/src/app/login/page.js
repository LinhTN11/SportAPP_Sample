'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { AlertTriangle, Crown, Home, User } from 'lucide-react';
import styles from './auth.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(form.email, form.password);

            if (user.role === 'ADMIN') router.push('/admin/venues');
            else if (user.role === 'OWNER') router.push('/owner/venues');
            else router.push('/venues');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (email) => {
        setForm({ email, password: 'password123' });
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
                    <h2 className={styles.authTitle}>Đăng nhập</h2>
                    <p className={styles.authSubtitle}>Chào mừng bạn quay lại</p>
                </div>

                {error && (
                    <div className={styles.errorBox}>
                        <span className={styles.errorIcon}><AlertTriangle size={18} /></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.authForm}>
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
                        <label className={styles.formLabel}>Mật khẩu</label>
                        <input
                            type="password"
                            className={styles.formInput}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.authBtn} disabled={loading}>
                        {loading ? <span className={styles.spinner}></span> : 'Đăng nhập'}
                    </button>
                </form>

                <div className={styles.demoBox}>
                    <p className={styles.demoTitle}>Tài khoản demo (password: password123)</p>
                    <div className={styles.demoAccounts}>
                        <button className={styles.demoBtn} onClick={() => fillDemo('admin@sportapp.com')}>
                            <Crown size={14} className={styles.demoIcon} style={{marginRight: '4px', display: 'inline', verticalAlign: 'text-bottom'}} /> Admin
                        </button>
                        <button className={styles.demoBtn} onClick={() => fillDemo('owner@sportapp.com')}>
                            <Home size={14} className={styles.demoIcon} style={{marginRight: '4px', display: 'inline', verticalAlign: 'text-bottom'}} /> Owner
                        </button>
                        <button className={styles.demoBtn} onClick={() => fillDemo('khach1@sportapp.com')}>
                            <User size={14} className={styles.demoIcon} style={{marginRight: '4px', display: 'inline', verticalAlign: 'text-bottom'}} /> Customer
                        </button>
                    </div>
                </div>

                <p className={styles.authSwitch}>
                    Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
}