'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { notificationsAPI } from '@/lib/api';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            notificationsAPI.list({ unreadOnly: 'true' })
                .then(({ data }) => setUnreadCount(data.data.unreadCount))
                .catch(() => { });
        }
    }, [isAuthenticated, pathname]);

    const navItems = isAuthenticated ? getNavItems(user.role) : [];

    return (
        <nav className={styles.nav}>
            <div className={styles.navInner}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>⚽</span>
                    <span className={styles.logoText}>SportApp</span>
                </Link>

                {/* Desktop Nav */}
                <div className={styles.navLinks}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>

                <div className={styles.navRight}>
                    {isAuthenticated ? (
                        <>
                            <Link href="/notifications" className={styles.notifBtn}>
                                🔔
                                {unreadCount > 0 && (
                                    <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                            </Link>
                            <div className={styles.userMenu}>
                                <button
                                    className={styles.userBtn}
                                    onClick={() => setMenuOpen(!menuOpen)}
                                >
                                    <div className={styles.avatar}>
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.fullName} className={styles.avatarImg} />
                                        ) : (
                                            user.fullName?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <span className={styles.userName}>{user.fullName}</span>
                                </button>
                                {menuOpen && (
                                    <div className={styles.dropdown}>
                                        <div className={styles.dropdownHeader}>
                                            <div className={styles.dropdownName}>{user.fullName}</div>
                                            <div className={styles.dropdownRole}>
                                                {user.role === 'ADMIN' ? '👑 Admin' : user.role === 'OWNER' ? '🏠 Chủ sân' : '👤 Khách hàng'}
                                            </div>
                                        </div>
                                        <div className={styles.dropdownDivider} />
                                        <Link href="/profile" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                                            Hồ sơ cá nhân
                                        </Link>
                                        {user.role === 'OWNER' && (
                                            <Link href="/owner/venues" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                                                Quản lý sân
                                            </Link>
                                        )}
                                        <div className={styles.dropdownDivider} />
                                        <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={logout}>
                                            Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.authBtns}>
                            <Link href="/login" className="btn btn-ghost">Đăng nhập</Link>
                            <Link href="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </div>
        </nav>
    );
}

function getNavItems(role) {
    if (role === 'CUSTOMER') {
        return [
            { href: '/venues', label: 'Tìm sân', icon: '🏟️' },
            { href: '/matchmaking', label: 'Ghép trận', icon: '🤝' },
            { href: '/bookings', label: 'Đặt sân của tôi', icon: '📅' },
            { href: '/chat', label: 'Tin nhắn', icon: '💬' },
        ];
    }

    if (role === 'OWNER') {
        return [
            { href: '/owner/venues', label: 'Quản lý sân', icon: '⚙️' },
            { href: '/owner/bookings', label: 'Lịch đặt', icon: '📋' },
            { href: '/chat', label: 'Tin nhắn', icon: '💬' },
        ];
    }

    if (role === 'ADMIN') {
        return [
            { href: '/admin/venues', label: 'Duyệt sân', icon: '✅' },
            { href: '/admin/users', label: 'Người dùng', icon: '👥' },
            { href: '/chat', label: 'Tin nhắn', icon: '💬' },
        ];
    }

    // Not logged in - show public items
    return [
        { href: '/venues', label: 'Tìm sân', icon: '🏟️' },
    ];
}
