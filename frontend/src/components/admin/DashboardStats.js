import { Users, CreditCard, ShoppingBag, Activity, TrendingUp, TrendingDown, Clock, MousePointer2 } from 'lucide-react';
import styles from '@/app/admin/dashboard/dashboard.module.css';

const StatCard = ({ title, value, icon: Icon, color, subtext, trendValue }) => {
    // Check if value includes a minus sign or is a negative number
    const isNegative = value.toString().includes('-') || (typeof value === 'number' && value < 0);
    
    return (
        <div className={styles.statCard}>
            <div className={styles.statHeader}>
                <div className={styles.statIcon} style={{ background: `${color}10`, color: color }}>
                    <Icon size={26} strokeWidth={2.5} />
                </div>
                {trendValue !== undefined && trendValue !== null && (
                    <div className={`${styles.statTrend} ${trendValue > 0 ? styles.trendUp : (trendValue < 0 ? styles.trendDown : '')}`}>
                        {trendValue > 0 ? <TrendingUp size={14} /> : (trendValue < 0 ? <TrendingDown size={14} /> : null)}
                        {Math.abs(trendValue)}%
                    </div>
                )}
            </div>
            <div className={styles.statBody}>
                <div className={styles.statLabel}>{title}</div>
                <div className={styles.statValue} style={{ color: isNegative ? '#ef4444' : '#0f172a' }}>
                    {value}
                </div>
                {subtext && (
                    <div className={styles.statTrend} style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px' }}>
                        <MousePointer2 size={12} strokeWidth={2} />
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function DashboardStats({ stats }) {
    if (!stats) return null;

    const { summary } = stats;

    return (
        <div className={styles.statsGrid}>
            <StatCard
                title="Doanh thu thực tế"
                value={`${(summary.totalRevenue || 0).toLocaleString('vi-VN')}đ`}
                icon={CreditCard}
                color="#4f46e5"
                trendValue={summary.revenueTrend}
                subtext="Booking đã hoàn thành (COMPLETED)"
            />
            <StatCard
                title="Lợi nhuận sàn (Phí HH)"
                value={`${(summary.totalCommission || 0).toLocaleString('vi-VN')}đ`}
                icon={TrendingUp}
                color="#10b981"
                trendValue={summary.commissionTrend}
                subtext="Phí hoa hồng trước thuế GTGT (5%)"
            />
            <StatCard
                title="Tổng Bookings"
                value={summary.totalBookings || 0}
                icon={ShoppingBag}
                color="#8b5cf6"
                trendValue={summary.bookingTrend}
                subtext={summary.todayBookings !== undefined ? `${summary.todayBookings} đơn hôm nay` : null}
            />
            <StatCard
                title="Người dùng mới"
                value={summary.newUsersRange ?? 0}
                icon={Users}
                color="#f59e0b"
                trendValue={summary.userTrend}
                subtext={`Tổng: ${summary.totalUsers || 0} người dùng trên nền tảng`}
            />
            <StatCard
                title="Sân chờ phê duyệt"
                value={summary.pendingVenues || 0}
                icon={Clock}
                color="#ef4444"
                subtext="Cần xử lý trong 24h"
            />
            <StatCard
                title="Tương tác xã hội"
                value={summary.totalMatches || 0}
                icon={Activity}
                color="#ec4899"
                subtext="Tin tuyển đối thủ trong kỳ"
            />
            <StatCard
                title="Thuế GTGT Sàn (10% HH)"
                value={`${(summary.platformVat || 0).toLocaleString('vi-VN')}đ`}
                icon={CreditCard}
                color="#6366f1"
                subtext="VAT sàn phải nộp (10% của phí HH)"
            />
            <StatCard
                title="Thuế thu hộ chủ sân"
                value={`${((summary.withheldOwnerVat || 0) + (summary.withheldOwnerPit || 0)).toLocaleString('vi-VN')}đ`}
                icon={ShoppingBag}
                color="#f43f5e"
                subtext={`GTGT: ${(summary.withheldOwnerVat || 0).toLocaleString('vi-VN')}đ (5%) | TNCN: ${(summary.withheldOwnerPit || 0).toLocaleString('vi-VN')}đ (2%)`}
            />
        </div>
    );
}
