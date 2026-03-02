'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>🚀 Nền tảng thể thao thông minh</div>
          <h1 className={styles.heroTitle}>
            Đặt sân. Ghép trận.<br />
            <span className={styles.heroGradient}>Tất cả trong một.</span>
          </h1>
          <p className={styles.heroDesc}>
            Tìm và đặt sân thể thao chỉ trong vài phút. Ghép đối thủ tự động hoặc thủ công.
            Thanh toán an toàn, quản lý lịch thông minh.
          </p>
          <div className={styles.heroActions}>
            {isAuthenticated ? (
              <>
                <Link href="/venues" className="btn btn-primary btn-lg">
                  🏟️ Tìm sân ngay
                </Link>
                <Link href="/matchmaking" className="btn btn-outline btn-lg">
                  🤝 Ghép trận
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Bắt đầu miễn phí
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Tại sao chọn SportApp?</h2>
          <p className={styles.sectionSubtitle}>
            Mọi thứ bạn cần cho trải nghiệm thể thao hoàn hảo
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🏟️</div>
              <h3 className={styles.featureTitle}>Đặt sân nhanh chóng</h3>
              <p className={styles.featureDesc}>
                Tìm sân trống, xem giá theo khung giờ, đặt cọc online chỉ trong vài click.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🤝</div>
              <h3 className={styles.featureTitle}>Ghép trận thông minh</h3>
              <p className={styles.featureDesc}>
                Tự tìm đối thủ hoặc để hệ thống tự động ghép theo môn, khung giờ và khu vực.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💬</div>
              <h3 className={styles.featureTitle}>Chat trực tiếp</h3>
              <p className={styles.featureDesc}>
                Nhắn tin real-time với đối thủ hoặc chủ sân để thống nhất lịch chơi.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📱</div>
              <h3 className={styles.featureTitle}>QR Code & Link riêng</h3>
              <p className={styles.featureDesc}>
                Mỗi sân có link đặt và mã QR riêng. Chia sẻ dễ dàng qua mạng xã hội.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <h3 className={styles.featureTitle}>Giá minh bạch</h3>
              <p className={styles.featureDesc}>
                Xem rõ giá theo khung giờ, không chi phí ẩn. Cọc chỉ 10%, thanh toán linh hoạt.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⭐</div>
              <h3 className={styles.featureTitle}>Đánh giá & Review</h3>
              <p className={styles.featureDesc}>
                Đọc review từ người chơi khác, đánh giá sau khi sử dụng để cộng đồng tốt hơn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className={styles.howItWorks}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Cách hoạt động</h2>
          <p className={styles.sectionSubtitle}>3 bước đơn giản để bắt đầu</p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Tìm & Chọn sân</h3>
              <p>Chọn môn thể thao, ngày giờ mong muốn. Hệ thống hiện sân trống kèm giá.</p>
            </div>
            <div className={styles.stepDivider}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Đặt cọc & Xác nhận</h3>
              <p>Cọc 10% để giữ chỗ. Thanh toán online hoặc trả trực tiếp tại sân.</p>
            </div>
            <div className={styles.stepDivider}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Chơi & Đánh giá</h3>
              <p>Đến sân, tận hưởng trận đấu. Sau đó đánh giá giúp cộng đồng.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Bạn là chủ sân?</h2>
            <p className={styles.ctaDesc}>
              Đăng ký tài khoản Chủ sân để tiếp cận hàng ngàn khách hàng. Quản lý sân, lịch đặt và doanh thu dễ dàng.
            </p>
            <Link href="/register?role=owner" className="btn btn-primary btn-lg">
              Đăng ký làm Chủ sân →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span>⚽ SportApp</span>
              <p>Nền tảng đặt sân thể thao trực tuyến</p>
            </div>
            <div className={styles.footerLinks}>
              <a href="#">Về chúng tôi</a>
              <a href="#">Điều khoản</a>
              <a href="#">Chính sách</a>
              <a href="#">Liên hệ</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            © 2026 SportApp. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
