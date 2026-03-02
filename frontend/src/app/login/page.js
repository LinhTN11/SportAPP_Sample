'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
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

            // Redirect based on role
            if (user.role === 'ADMIN') router.push('/admin/venues');
            else if (user.role === 'OWNER') router.push('/owner/venues');
            else router.push('/venues');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <h1 className={styles.authTitle}>Đăng nhập</h1>
                    <p className={styles.authSubtitle}>Chào mừng bạn quay lại SportApp</p>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mật khẩu</label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-input"
                            placeholder="Nhập mật khẩu"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        id="login-submit"
                        type="submit"
                        className={`btn btn-primary ${styles.authBtn}`}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Đăng nhập'}
                    </button>
                </form>

                <p className={styles.authSwitch}>
                    Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
                </p>

                {/* Demo accounts */}
                <div className={styles.demoBox}>
                    <p className={styles.demoTitle}>Demo accounts (password: password123)</p>
                    <div className={styles.demoAccounts}>
                        <button
                            className={styles.demoBtn}
                            onClick={() => setForm({ email: 'admin@sportapp.com', password: 'password123' })}
                        >
                            👑 Admin
                        </button>
                        <button
                            className={styles.demoBtn}
                            onClick={() => setForm({ email: 'owner@sportapp.com', password: 'password123' })}
                        >
                            🏠 Owner
                        </button>
                        <button
                            className={styles.demoBtn}
                            onClick={() => setForm({ email: 'khach1@sportapp.com', password: 'password123' })}
                        >
                            👤 Customer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
