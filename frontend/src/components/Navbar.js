/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState, useRef } from 'react';
import { notificationsAPI, chatAPI, getImageUrl } from '@/lib/api';
import { User, History, LogOut, LogIn, UserPlus, ChevronDown, Mail } from 'lucide-react';
import { io } from 'socket.io-client';
import styles from './Navbar.module.css';

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      // 1. Fetch system notifications unread
      notificationsAPI.list({ unreadOnly: 'true' })
        .then(({ data }) => setUnreadCount(data.data.unreadCount))
        .catch(() => {});

      // 2. Fetch chat messages unread
      chatAPI.getUnreadCount()
        .then(({ data }) => setChatUnreadCount(data.data.unreadCount))
        .catch(() => {});

      // 3. Setup Socket for real-time updates
      const token = localStorage.getItem('sportapp_token');
      if (!token) return;

      const socket = io(SERVER_URL, { auth: { token } });
      
      socket.on('message_notification', () => {
        // Increment count when new message arrives and user is not on chat page
        if (pathname !== '/chat') {
          setChatUnreadCount(prev => prev + 1);
        }
      });

      socket.on('all_messages_read', () => {
        // Re-fetch count when messages are read in another tab/component
        chatAPI.getUnreadCount()
          .then(({ data }) => setChatUnreadCount(data.data.unreadCount))
          .catch(() => {});
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // biến đổi giao diện theo quyền hạn người dùng
  const navItems = isAuthenticated ? getNavItems(user.role) : [];

  const handleLogout = () => {
    setIsDropdownOpen(false);
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
    }
  };

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoGradient}>SportBook</span>
      </Link>
      <div className={styles.navCenter}>

        {/* so sánh role để hiển thị*/}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
          >
            {item.label}
            {item.href === '/notifications' && unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
            {item.href === '/chat' && chatUnreadCount > 0 && pathname !== '/chat' && (
              <span className={styles.unreadBadge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>
            )}
            {pathname === item.href && <span className={styles.navLinkUnderline} />}
          </Link>
        ))}

        {/* ── User dropdown ── */}
        <div className={styles.userDropdown} ref={dropdownRef}>

          {isAuthenticated ? (
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={styles.userBtn}
            >
              <div className={styles.avatar}>
                {user.avatarUrl
                  ? <img src={getImageUrl(user.avatarUrl)} alt="Avatar" className={styles.avatarImg} />
                  : <User size={18} className={styles.avatarIcon} />
                }
              </div>
              <span className={styles.userName}>{user.fullName}</span>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
              />
            </button>
          ) : (
            /* Guest — show Login + Register buttons inline (matches page.js hero buttons) */
            <div className={styles.guestActions}>
              <Link href="/login" className={styles.btnOutline}>
                Đăng nhập
              </Link>
              <Link href="/register" className={styles.btnPrimary}>
                Đăng ký miễn phí
              </Link>
            </div>
          )}

          {/* ── Dropdown panel ── */}
          {isDropdownOpen && (
            <div className={styles.dropdownMenu}>

              {isAuthenticated ? (
                <>
                  {/* Header */}
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userInfoRow}>
                      <div className={styles.avatarLarge}>
                        {user.avatarUrl
                          ? <img src={getImageUrl(user.avatarUrl)} alt="Avatar" className={styles.avatarImg} />
                          : <User size={22} className={styles.avatarIcon} />
                        }
                      </div>
                      <div className={styles.userDetails}>
                        <p className={styles.userFullname}>{user.fullName}</p>
                        <div className={styles.userEmailRow}>
                          <Mail size={12} />
                          <span className={styles.userEmail}>{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className={styles.dropdownContent}>
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className={styles.dropdownItem}
                    >
                      <div className={styles.dropdownItemIcon}>
                        <User size={18} />
                      </div>
                      <div className={styles.dropdownItemText}>
                        <div className={styles.itemTitle}>Hồ sơ cá nhân</div>
                        <div className={styles.itemDesc}>Xem và chỉnh sửa thông tin</div>
                      </div>
                    </Link>

                    {user.role === 'CUSTOMER' && (
                      <Link
                        href="/bookings"
                        onClick={() => setIsDropdownOpen(false)}
                        className={styles.dropdownItem}
                      >
                        <div className={styles.dropdownItemIcon}>
                          <History size={18} />
                        </div>
                        <div className={styles.dropdownItemText}>
                          <div className={styles.itemTitle}>Lịch sử đặt sân</div>
                          <div className={styles.itemDesc}>Xem các lần đặt sân trước đó</div>
                        </div>
                      </Link>
                    )}

                    {user.role === 'OWNER' && (
                      <Link
                        href="/owner/venues"
                        onClick={() => setIsDropdownOpen(false)}
                        className={styles.dropdownItem}
                      >
                        <div className={styles.dropdownItemIcon}>
                          <History size={18} />
                        </div>
                        <div className={styles.dropdownItemText}>
                          <div className={styles.itemTitle}>Quản lý sân</div>
                          <div className={styles.itemDesc}>Cài đặt và theo dõi sân</div>
                        </div>
                      </Link>
                    )}

                    {user.role === 'OWNER' && (
                      <Link
                        href="/owner/taxes"
                        onClick={() => setIsDropdownOpen(false)}
                        className={styles.dropdownItem}
                      >
                        <div className={styles.dropdownItemIcon}>
                          <History size={18} />
                        </div>
                        <div className={styles.dropdownItemText}>
                          <div className={styles.itemTitle}>Thuế & Chứng từ</div>
                          <div className={styles.itemDesc}>Khấu trừ thuế và chứng từ ĐT</div>
                        </div>
                      </Link>
                    )}
                  </div>

                  {/* Footer — logout */}
                  <div className={styles.dropdownFooter}>
                    <button
                      onClick={handleLogout}
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    >
                      <div className={styles.dropdownItemIconDanger}>
                        <LogOut size={18} />
                      </div>
                      <span className={styles.itemTitle}>Đăng xuất</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Guest dropdown panel */
                <div className={styles.guestPanel}>
                  <div className={styles.guestPanelTop}>
                    <div className={styles.guestIconWrap}>
                      <User size={28} className={styles.guestUserIcon} />
                    </div>
                    <p className={styles.guestTitle}>Đăng nhập để đặt sân</p>
                    <p className={styles.guestSubtitle}>và xem lịch sử đặt sân của bạn</p>
                  </div>

                  <Link
                    href="/login"
                    onClick={() => setIsDropdownOpen(false)}
                    className={styles.dropdownBtnPrimary}
                  >
                    <LogIn size={18} />
                    <span>Đăng nhập</span>
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setIsDropdownOpen(false)}
                    className={styles.dropdownBtnSecondary}
                  >
                    <UserPlus size={18} />
                    <span>Đăng ký tài khoản</span>
                  </Link>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function getNavItems(role) {
  if (role === 'CUSTOMER') {
    return [
      { href: '/venues',    label: 'Tìm sân' },
      { href: '/matchmaking', label: 'Ghép trận' },
      { href: '/bookings',  label: 'Đặt sân của tôi' },
      { href: '/chat',      label: 'Tin nhắn' },
      { href: '/notifications', label: 'Thông báo' },
      { href: '/support',       label: 'Hỗ trợ' },
    ];
  }
  if (role === 'OWNER') {
    return [
      { href: '/owner/venues',   label: 'Quản lý sân' },
      { href: '/owner/bookings', label: 'Lịch đặt' },
      { href: '/owner/taxes',    label: 'Thuế & Chứng từ' },
      { href: '/chat',           label: 'Tin nhắn' },
      { href: '/notifications',  label: 'Thông báo' },
      { href: '/support',        label: 'Hỗ trợ' },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { href: '/admin/dashboard', label: 'Dashboard' },
      { href: '/admin/venues', label: 'Duyệt sân' },
      { href: '/admin/users',  label: 'Người dùng' },
      { href: '/admin/taxes',  label: 'Quản lý thuế' },
      { href: '/admin/support', label: 'Hộp thư HT' },
      { href: '/chat',         label: 'Tin nhắn' },
      { href: '/notifications',  label: 'Thông báo' },
    ];
  }
  return [{ href: '/venues', label: 'Tìm sân' }];
}