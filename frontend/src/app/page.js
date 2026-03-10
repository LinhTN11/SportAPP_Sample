'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';
import PageFooter from '../components/PageFooter';

const sportOptions = [
  { value: 'football', label: 'Bóng đá' },
  { value: 'badminton', label: 'Cầu lông' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'basketball', label: 'Bóng rổ' },
  { value: 'volleyball', label: 'Bóng chuyền' },
  { value: 'pickleball', label: 'Pickleball' },
];

const timeOptions = [
  'Hôm nay, 18:00',
  'Hôm nay, 19:00',
  'Hôm nay, 20:00',
  'Ngày mai, 08:00',
  'Ngày mai, 18:00',
  'Cuối tuần này',
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [sportOpen, setSportOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState(sportOptions[0]);
  const [selectedTime, setSelectedTime] = useState(timeOptions[0]);
  const [locationValue, setLocationValue] = useState('');

  const sportRef = useRef(null);
  const timeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sportRef.current && !sportRef.current.contains(e.target)) setSportOpen(false);
      if (timeRef.current && !timeRef.current.contains(e.target)) setTimeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedSport.value) params.set('sportType', selectedSport.value);
    if (locationValue.trim()) params.set('city', locationValue.trim());
    router.push(`/venues${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageInner}>

        {/* ══════════════════════════════
            HERO
        ══════════════════════════════ */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              🏃‍♂️ Nền tảng thể thao thông minh
            </div>
            <h1 className={styles.heroTitle}>
              Đặt sân. Ghép trận.<br />
              <span className={styles.heroAccent}>Tất cả trong một.</span>
            </h1>
            <p className={styles.heroDesc}>
              Tìm và đặt sân thể thao chỉ trong vài phút. Ghép đối thủ tự động hoặc thủ công.
              Thanh toán an toàn, quản lý lịch thông minh.
            </p>
            <div className={styles.heroActions}>
              {isAuthenticated ? (
                <>
                  <Link href="/venues" className={styles.btnPrimary}>
                    🏟️ Tìm sân ngay
                  </Link>
                  <Link href="/matchmaking" className={styles.btnOutline}>
                    🤝 Ghép trận
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className={styles.btnPrimary}>
                    Bắt đầu miễn phí
                  </Link>
                  <Link href="/login" className={styles.btnOutline}>
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════
            SEARCH WIDGET
        ══════════════════════════════ */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchBar}>

            {/* ── Cột 1: Môn thể thao ── */}
            <div className={styles.searchField} ref={sportRef} onClick={() => { setSportOpen(!sportOpen); setTimeOpen(false); }}>
              <div className={styles.searchFieldIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <div className={styles.searchFieldBody}>
                <span className={styles.searchLabel}>Môn thể thao</span>
                <div className={styles.searchValueRow}>
                  <span className={styles.searchValue}>{selectedSport.label}</span>
                  <svg className={`${styles.chevron} ${sportOpen ? styles.chevronOpen : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {sportOpen && (
                <div className={styles.dropdownMenu}>
                  {sportOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownOption} ${selectedSport.value === opt.value ? styles.dropdownOptionActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSport(opt);
                        setSportOpen(false);
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.searchDivider} />

            {/* ── Cột 2: Địa điểm ── */}
            <div className={styles.searchField} onClick={() => { setSportOpen(false); setTimeOpen(false); }}>
              <div className={styles.searchFieldIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className={styles.searchFieldBody}>
                <span className={styles.searchLabel}>Khu vực</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Quận/Huyện, TP"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.searchDivider} />

            {/* ── Cột 3: Thời gian ── */}
            <div className={styles.searchField} ref={timeRef} onClick={() => { setTimeOpen(!timeOpen); setSportOpen(false); }}>
              <div className={styles.searchFieldIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className={styles.searchFieldBody}>
                <span className={styles.searchLabel}>Thời gian</span>
                <div className={styles.searchValueRow}>
                  <span className={styles.searchValue}>{selectedTime}</span>
                  <svg className={`${styles.chevron} ${timeOpen ? styles.chevronOpen : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {timeOpen && (
                <div className={styles.dropdownMenu}>
                  {timeOptions.map((opt) => (
                    <div
                      key={opt}
                      className={`${styles.dropdownOption} ${selectedTime === opt ? styles.dropdownOptionActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTime(opt);
                        setTimeOpen(false);
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Cột 4: Nút tìm ── */}
            <div className={styles.searchBtnWrap}>
              <button className={styles.searchBtn} onClick={handleSearch}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Tìm ngay
              </button>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════
            FEATURES
        ══════════════════════════════ */}
        <section className={styles.features}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Tại sao chọn SportBook?</h2>
            <p className={styles.sectionSubtitle}>
              Mọi thứ bạn cần cho trải nghiệm thể thao hoàn hảo
            </p>

            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconPurple}`}>🏟️</div>
                <h3 className={styles.featureTitle}>Đặt sân nhanh chóng</h3>
                <p className={styles.featureDesc}>Tìm sân trống, xem giá theo khung giờ, đặt cọc online chỉ trong vài click.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconYellow}`}>🤝</div>
                <h3 className={styles.featureTitle}>Ghép trận thông minh</h3>
                <p className={styles.featureDesc}>Tự tìm đối thủ hoặc để hệ thống tự động ghép theo môn, khung giờ và khu vực.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconPurple}`}>💬</div>
                <h3 className={styles.featureTitle}>Chat trực tiếp</h3>
                <p className={styles.featureDesc}>Nhắn tin real-time với đối thủ hoặc chủ sân để thống nhất lịch chơi.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconBlue}`}>📱</div>
                <h3 className={styles.featureTitle}>QR Code & Link riêng</h3>
                <p className={styles.featureDesc}>Mỗi sân có link đặt và mã QR riêng. Chia sẻ dễ dàng qua mạng xã hội.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconOrange}`}>💰</div>
                <h3 className={styles.featureTitle}>Giá minh bạch</h3>
                <p className={styles.featureDesc}>Xem rõ giá theo khung giờ, không phí ẩn. Cọc chỉ 10%, thanh toán linh hoạt.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={`${styles.featureIconWrap} ${styles.iconYellow}`}>⭐</div>
                <h3 className={styles.featureTitle}>Đánh giá & Review</h3>
                <p className={styles.featureDesc}>Đọc review từ người chơi khác, đánh giá sau khi sử dụng để cộng đồng tốt hơn.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════
            HOW IT WORKS
        ══════════════════════════════ */}
        <section className={styles.howItWorks}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Cách hoạt động</h2>
            <p className={styles.sectionSubtitle}>3 bước đơn giản để bắt đầu</p>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.stepBlue}`}>1</div>
                <h3 className={styles.stepTitle}>Tìm & Chọn sân</h3>
                <p className={styles.stepDesc}>Chọn môn thể thao, ngày giờ mong muốn. Hệ thống hiển sân trống kèm giá.</p>
              </div>

              <div className={styles.stepArrow}>→</div>

              <div className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.stepPink}`}>2</div>
                <h3 className={styles.stepTitle}>Đặt cọc & Xác nhận</h3>
                <p className={styles.stepDesc}>Cọc 10% để giữ chỗ. Thanh toán online hoặc trả trực tiếp tại sân.</p>
              </div>

              <div className={styles.stepArrow}>→</div>

              <div className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.stepPurple}`}>3</div>
                <h3 className={styles.stepTitle}>Chơi & Đánh giá</h3>
                <p className={styles.stepDesc}>Đến sân, tận hưởng trận đấu. Sau đó đánh giá giúp cộng đồng.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════
            CTA — Chủ sân
        ══════════════════════════════ */}
        <section className={styles.cta}>
          <div className={styles.ctaInner}>
            <div className={styles.ctaLeft}>
              <h2 className={styles.ctaTitle}>Bạn là chủ sân?</h2>
              <p className={styles.ctaDesc}>
                Đăng ký tài khoản Chủ sân để tiếp cận hàng ngàn khách hàng.
                Quản lý sân, lịch đặt và doanh thu dễ dàng.
              </p>
              <Link href="/register?role=owner" className={styles.ctaBtn}>
                Đăng ký làm Chủ sân →
              </Link>
            </div>

            <div className={styles.ctaRight}>
              <div className={styles.tabletMockup}>
                <div className={styles.tabletScreen}>
                  <div className={styles.tabletHeader}>
                    <span className={styles.tabletTitle}>Dashboard Chủ Sân</span>
                    <span className={styles.tabletBadge}>● Live</span>
                  </div>
                  <div className={styles.tabletStats}>
                    <div className={styles.tabletStatCard}>
                      <div className={styles.tabletStatNum}>34</div>
                      <div className={styles.tabletStatLabel}>Đơn hôm nay</div>
                    </div>
                    <div className={styles.tabletStatCard}>
                      <div className={`${styles.tabletStatNum} ${styles.statGreen}`}>87%</div>
                      <div className={styles.tabletStatLabel}>Lấp đầy</div>
                    </div>
                    <div className={styles.tabletStatCard}>
                      <div className={`${styles.tabletStatNum} ${styles.statBlue}`}>12tr+</div>
                      <div className={styles.tabletStatLabel}>Doanh thu</div>
                    </div>
                  </div>
                  <div className={styles.tabletRows}>
                    {['Sân A1 · 08:00–10:00', 'Sân B2 · 15:00–17:00', 'Sân C3 · 19:00–21:00'].map((row, i) => (
                      <div key={i} className={styles.tabletRow}>
                        <span>{row}</span>
                        <span className={styles.tabletRowBadge}>Đã đặt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PageFooter />
      </div>
    </div>
  );
}