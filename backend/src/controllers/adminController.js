const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getSettings, saveSettings } = require('../config/platformSettings');

/**
 * Get overall dashboard statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let startDate = new Date(0);
        let endDate = new Date(now);
        let prevStartDate = new Date(0);
        let prevEndDate = new Date(0);

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 1);
            prevEndDate = new Date(startDate);
        } else if (period === '7d') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 7);
            prevEndDate = new Date(startDate);
        } else if (period === '30d') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 30);
            prevEndDate = new Date(startDate);
        } else if (period === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEndDate = new Date(startDate);
        } else {
            // 'all'
            startDate = new Date(0);
            prevStartDate = new Date(0);
            prevEndDate = new Date(0);
        }

        const dateFilter = period !== 'all' ? { gte: startDate, lte: endDate } : undefined;
        // avoid passing undefined to where object if we don't want to filter at all
        const currentWhere = dateFilter ? { createdAt: dateFilter } : {};
        const prevWhere = period !== 'all' ? { createdAt: { gte: prevStartDate, lte: prevEndDate } } : { createdAt: { lte: new Date(0) } };

        const [
            totalUsers,
            roleCounts,
            venueCounts,
            pendingVenuesCount,
            matchmakingCount,
            todayBookings,
            
            // Current: CONFIRMED+COMPLETED (booking count)
            currentBookingsAgg,
            // Current: COMPLETED only (actual revenue & taxes)
            currentCompletedAgg,
            currentNewUsers,
            
            // Previous: CONFIRMED+COMPLETED
            prevBookingsAgg,
            // Previous: COMPLETED only
            prevCompletedAgg,
            prevNewUsers
        ] = await Promise.all([
            prisma.user.count(),                                          // all-time total
            prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
            prisma.venue.groupBy({ by: ['status'], _count: { id: true } }),
            prisma.venue.count({ where: { status: 'PENDING' } }),
            prisma.matchmakingPost.count({ where: currentWhere }), // period-filtered
            prisma.booking.count({ where: { createdAt: { gte: startOfDay } } }),
            
            // Current period - CONFIRMED+COMPLETED for bookings count
            prisma.booking.aggregate({
                _sum: { 
                    totalPrice: true, 
                    commissionAmount: true,
                    platformFee: true,
                    platformVat: true,
                    ownerVat: true,
                    ownerPit: true
                },
                _count: { id: true },
                where: { 
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    ...currentWhere
                }
            }),
            // Current period - COMPLETED only for actual revenue
            prisma.booking.aggregate({
                _sum: { totalPrice: true, platformFee: true, platformVat: true, ownerVat: true, ownerPit: true },
                where: { status: 'COMPLETED', ...currentWhere }
            }),
            prisma.user.count({ where: currentWhere }),

            // Previous period
            prisma.booking.aggregate({
                _sum: { 
                    totalPrice: true, 
                    commissionAmount: true,
                    platformFee: true,
                    platformVat: true,
                    ownerVat: true,
                    ownerPit: true
                },
                _count: { id: true },
                where: { 
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    ...prevWhere
                }
            }),
            prisma.booking.aggregate({
                _sum: { totalPrice: true, platformFee: true },
                where: { status: 'COMPLETED', ...prevWhere }
            }),
            prisma.user.count({ where: prevWhere })
        ]);

        const calcTrend = (current, previous) => {
            if (period === 'all') return 0;
            if (previous === 0) return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        // Booking count (CONFIRMED + COMPLETED)
        const currBookings = currentBookingsAgg._count.id;
        const prevBookings = prevBookingsAgg._count.id;

        // Doanh thu thực tế = totalPrice của COMPLETED (đã hoàn thành)
        const currRevenue = Number(currentCompletedAgg._sum.totalPrice || 0);
        const prevRevenue = Number(prevCompletedAgg._sum.totalPrice || 0);

        // Lợi nhuận sàn = platformFee của COMPLETED
        // Fallback: nếu platformFee null (booking cũ) → tính 5% totalPrice
        const currPlatformFeeRaw = Number(currentCompletedAgg._sum.platformFee);
        const currPlatformFee = currPlatformFeeRaw > 0
            ? currPlatformFeeRaw
            : Math.round(currRevenue * 0.05);

        const prevPlatformFeeRaw = Number(prevCompletedAgg._sum.platformFee);
        const prevPlatformFee = prevPlatformFeeRaw > 0
            ? prevPlatformFeeRaw
            : Math.round(prevRevenue * 0.05);

        // Thuế VAT sàn (10% của platformFee)
        const currPlatformVatRaw = Number(currentCompletedAgg._sum.platformVat);
        const currPlatformVat = currPlatformVatRaw > 0
            ? currPlatformVatRaw
            : Math.round(currPlatformFee * 0.10);

        // Thuế thu hộ chủ sân (ownerVat=5%, ownerPit=2% của totalPrice)
        const currOwnerVatRaw = Number(currentCompletedAgg._sum.ownerVat);
        const currOwnerVat = currOwnerVatRaw > 0
            ? currOwnerVatRaw
            : Math.round(currRevenue * 0.05);

        const currOwnerPitRaw = Number(currentCompletedAgg._sum.ownerPit);
        const currOwnerPit = currOwnerPitRaw > 0
            ? currOwnerPitRaw
            : Math.round(currRevenue * 0.02);

        res.json({
            success: true,
            data: {
                summary: {
                    totalUsers,
                    newUsersRange: currentNewUsers,
                    userTrend: calcTrend(currentNewUsers, prevNewUsers),
                    
                    totalVenues: venueCounts.reduce((sum, v) => sum + v._count.id, 0),
                    pendingVenues: pendingVenuesCount,
                    
                    totalBookings: currBookings,
                    todayBookings,
                    bookingTrend: calcTrend(currBookings, prevBookings),
                    
                    // Doanh thu thực (chỉ COMPLETED)
                    totalRevenue: currRevenue,
                    revenueTrend: calcTrend(currRevenue, prevRevenue),
                    
                    // Lợi nhuận sàn = platformFee (trước thuế GTGT)
                    totalCommission: currPlatformFee,
                    commissionTrend: calcTrend(currPlatformFee, prevPlatformFee),

                    // Doanh thu sàn sau khi tách ra riêng
                    platformRevenue: currPlatformFee,
                    platformVat: currPlatformVat,
                    withheldOwnerVat: currOwnerVat,
                    withheldOwnerPit: currOwnerPit,
                    
                    totalMatches: matchmakingCount
                },
                roleDistribution: roleCounts.map(r => ({ role: r.role, count: r._count.id })),
                venueStatus: venueCounts.map(v => ({ status: v.status, count: v._count.id }))
            }
        });
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching stats' });
    }
};

/**
 * Get chart data for revenue and bookings over the last 30 days
 */
const getChartData = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Revenue & Booking count by date
        // Note: Prisma groupBy doesn't directly support date formatting in PostgreSQL easily without raw query
        // or post-processing. We'll fetch and post-process for simplicity.
        const bookings = await prisma.booking.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                status: { in: ['CONFIRMED', 'COMPLETED'] }
            },
            select: {
                createdAt: true,
                totalPrice: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by date in JS
        const chartMap = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            chartMap[dateStr] = { date: dateStr, revenue: 0, count: 0 };
        }

        bookings.forEach(b => {
            const dateStr = b.createdAt.toISOString().split('T')[0];
            if (chartMap[dateStr]) {
                chartMap[dateStr].revenue += Number(b.totalPrice);
                chartMap[dateStr].count += 1;
            }
        });

        const chartData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('Error in getChartData:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching chart data' });
    }
};

/**
 * Get latest activity (bookings, users, venues)
 */
const getRecentActivity = async (req, res) => {
    try {
        const [recentBookings, recentUsers, recentVenues] = await Promise.all([
            prisma.booking.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { fullName: true, avatarUrl: true } },
                    field: { include: { venue: { select: { name: true } } } }
                }
            }),
            prisma.user.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                select: { id: true, fullName: true, email: true, role: true, createdAt: true, avatarUrl: true }
            }),
            prisma.venue.findMany({
                take: 5,
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
                include: { owner: { select: { fullName: true } } }
            })
        ]);

        res.json({
            success: true,
            data: {
                recentBookings,
                recentUsers,
                recentVenues
            }
        });
    } catch (error) {
        console.error('Error in getRecentActivity:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching recent activity' });
    }
};

/**
 * Admin: List all users with search & filter
 * GET /api/admin/users?page=1&limit=15&role=&search=
 */
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 15, role, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            ...(role ? { role } : {}),
            ...(search ? {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email:    { contains: search, mode: 'insensitive' } },
                    { phone:    { contains: search, mode: 'insensitive' } },
                ]
            } : {})
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true, email: true, fullName: true, phone: true,
                    avatarUrl: true, role: true, isVerified: true, createdAt: true,
                    _count: { select: { bookings: true } }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Admin: Update a user's role  PATCH /api/admin/users/:id/role
 */
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['CUSTOMER', 'OWNER', 'ADMIN'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot change your own role' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: { id: true, fullName: true, email: true, role: true }
        });

        res.json({ success: true, data: { user } });
    } catch (error) {
        console.error('Error in updateUserRole:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Admin: Update a user's tax info  PATCH /api/admin/users/:id/tax-info
 */
const updateUserTaxInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const { taxCode, address } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(taxCode !== undefined && { taxCode }),
                ...(address !== undefined && { address }),
            },
            select: { id: true, fullName: true, email: true, taxCode: true, address: true }
        });

        res.json({ success: true, message: 'Tax info updated', data: { user } });
    } catch (error) {
        console.error('Error in updateUserTaxInfo:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Admin: Delete a user  DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Admin: Get platform settings  GET /api/admin/settings/platform
 */
const getPlatformSettings = (req, res) => {
    try {
        const settings = getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể đọc cài đặt nền tảng' });
    }
};

/**
 * Admin: Update platform settings  PATCH /api/admin/settings/platform
 */
const updatePlatformSettings = (req, res) => {
    try {
        const { platformName, taxCode, address, representative } = req.body;
        const updated = saveSettings({ platformName, taxCode, address, representative });
        res.json({ success: true, message: 'Cài đặt đã được lưu', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể lưu cài đặt nền tảng' });
    }
};

module.exports = {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getUsers,
    updateUserRole,
    updateUserTaxInfo,
    deleteUser,
    getPlatformSettings,
    updatePlatformSettings,
};
