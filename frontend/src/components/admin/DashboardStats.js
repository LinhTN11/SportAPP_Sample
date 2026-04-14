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
                {trendValue !== undefined && (
                    <div className={`${styles.statTrend} ${trendValue > 0 ? styles.trendUp : styles.trendDown}`}>
                        {trendValue > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
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
                trendValue={12.5}
                subtext="Giá trị booking hoàn thành"
            />
            <StatCard
                title="Lợi nhuận gộp"
                value={`${(summary.totalCommission || 0).toLocaleString('vi-VN')}đ`}
                icon={TrendingUp}
                color="#10b981"
                trendValue={-5.4}
                subtext="Từ phí hoa hồng sân"
            />
            <StatCard
                title="Tổng Bookings"
                value={summary.totalBookings}
                icon={ShoppingBag}
                color="#8b5cf6"
                trendValue={-2.4}
                subtext={`${summary.todayBookings} đơn hôm nay`}
            />
            <StatCard
                title="Người dùng"
                value={summary.totalUsers}
                icon={Users}
                color="#f59e0b"
                trendValue={15.8}
                subtext={`+${summary.newUsersLast7Days} khách mới`}
            />
            <StatCard
                title="Sân chờ phê duyệt"
                value={summary.pendingVenues}
                icon={Clock}
                color="#ef4444"
                subtext="Cần xử lý trong 24h"
            />
            <StatCard
                title="Tương tác xã hội"
                value={summary.totalMatches}
                icon={Activity}
                color="#ec4899"
                subtext="Tin tuyển đối thủ mới"
            />
        </div>
    );
}
