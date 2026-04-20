'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, RefreshCcw, AlertTriangle } from 'lucide-react';
import styles from './dashboard.module.css';

// Components
import DashboardStats from '@/components/admin/DashboardStats';
import DashboardCharts from '@/components/admin/DashboardCharts';
import RecentActivity from '@/components/admin/RecentActivity';
import CustomSelect from '@/components/ui/CustomSelect';

const TIME_PERIODS = [
    { value: 'today', label: 'Hôm nay' },
    { value: '7d', label: '7 ngày qua' },
    { value: '30d', label: '30 ngày qua' },
    { value: 'this_month', label: 'Tháng này' },
    { value: 'all', label: 'Toàn thời gian' },
];

export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [period, setPeriod] = useState('30d');

    // Check authorization
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, user, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [statsRes, chartsRes, activityRes] = await Promise.all([
                adminAPI.getStats({ period }),
                adminAPI.getCharts(),
                adminAPI.getActivity()
            ]);

            setStats(statsRes.data.data);
            setChartData(chartsRes.data.data);
            setActivity(activityRes.data.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Dashboard data fetch error:', err);
            setError('Không thể tải dữ liệu dashboard. Vui lòng kiểm tra quyền truy cập hoặc thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, period]);

    if (authLoading || (loading && !stats)) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingOverlay}>
                    <RefreshCcw className="spinner" size={40} style={{ color: '#3b82f6' }} />
                    <p>Đang tải dữ liệu dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.emptyState}>
                    <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                    <h2 className={styles.chartTitle}>{error}</h2>
                    <button 
                        onClick={fetchData} 
                        style={{ marginTop: 16, padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container">
                {/* Header Section */}
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Bảng điều khiển Admin</h1>
                        <p className={styles.subtitle}>
                            Theo dõi các chỉ số kinh doanh và vận hành hệ thống
                        </p>
                    </div>
                    <div className={styles.headerActions} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 160 }}>
                            <CustomSelect 
                                value={period}
                                onChange={(val) => setPeriod(val)}
                                options={TIME_PERIODS}
                                fixed
                            />
                        </div>
                        <button 
                            onClick={fetchData} 
                            className={styles.panelAction} 
                            disabled={loading}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 8, 
                                border: '1px solid #e2e8f0', 
                                padding: '10px 20px', 
                                borderRadius: '12px', 
                                background: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <RefreshCcw size={16} className={loading ? 'spinner' : ''} /> 
                            Làm mới
                        </button>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
                        </span>
                    </div>
                </header>

                {/* Dashboard Stats Cards */}
                <DashboardStats stats={stats} />

                {/* Grid for Charts */}
                <DashboardCharts chartData={chartData} stats={stats} />

                {/* Recent Activity Section */}
                <RecentActivity activity={activity} />
            </div>
        </div>
    );
}
