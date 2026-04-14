import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from '@/app/admin/dashboard/dashboard.module.css';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for very small slices

    return (
        <text 
            x={x} 
            y={y} 
            fill="white" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize={11} 
            fontWeight={800}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function DashboardCharts({ chartData, stats }) {
    if (!chartData || !stats) return null;

    const roleData = stats.roleDistribution.map(r => ({
        name: r.role === 'CUSTOMER' ? 'Khách hàng' : r.role === 'OWNER' ? 'Chủ sân' : 'Admin',
        value: r.count
    }));

    // Premium Color Palette Matching CSS
    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

    const formatCurrency = (val) => `${val.toLocaleString('vi-VN')}đ`;

    return (
        <div className={styles.chartsGrid}>
            {/* Revenue Trend Area Chart */}
            <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <div>
                        <h3 className={styles.chartTitle}>Phân tích doanh thu</h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>30 ngày vừa qua</p>
                    </div>
                </div>
                <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                                dy={15}
                            />
                            <YAxis 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${val/1000}k`}
                                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                            />
                            <Tooltip 
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                    backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ color: '#0f172a', fontWeight: 700, fontSize: '14px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#6366f1" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                                animationDuration={2000}
                                activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5', shadow: '0 0 10px rgba(79, 70, 229, 0.4)' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* User Distribution Donut Chart */}
            <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={styles.chartHeader}>
                    <div>
                        <h3 className={styles.chartTitle}>Cơ cấu người dùng</h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>Tỷ lệ theo vai trò</p>
                    </div>
                </div>
                <div style={{ width: '100%', height: 320, position: 'relative' }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={roleData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                innerRadius={80}
                                outerRadius={105}
                                paddingAngle={8}
                                cornerRadius={10}
                                dataKey="value"
                                stroke="none"
                                animationBegin={0}
                                animationDuration={1800}
                            >
                                {roleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                    padding: '10px 16px'
                                }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                iconType="circle" 
                                iconSize={10}
                                wrapperStyle={{ paddingTop: '32px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ 
                        position: 'absolute', 
                        top: '44%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        textAlign: 'center',
                        pointerEvents: 'none'
                    }}>
                        <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.05em' }}>
                            {stats.summary.totalUsers}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            THÀNH VIÊN
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
