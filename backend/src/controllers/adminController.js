const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get overall dashboard statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            totalUsers,
            roleCounts,
            venueCounts,
            bookingAgg,
            pendingVenuesCount,
            matchmakingCount,
            newUsers7d,
            todayBookings
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
            prisma.venue.groupBy({ by: ['status'], _count: { id: true } }),
            prisma.booking.aggregate({
                _sum: { totalPrice: true, commissionAmount: true },
                _count: { id: true },
                where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
            }),
            prisma.venue.count({ where: { status: 'PENDING' } }),
            prisma.matchmakingPost.count(),
            prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.booking.count({ where: { createdAt: { gte: startOfDay } } })
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    totalUsers,
                    newUsersLast7Days: newUsers7d,
                    totalVenues: venueCounts.reduce((sum, v) => sum + v._count.id, 0),
                    pendingVenues: pendingVenuesCount,
                    totalBookings: bookingAgg._count.id,
                    todayBookings,
                    totalRevenue: Number(bookingAgg._sum.totalPrice || 0),
                    totalCommission: Number(bookingAgg._sum.commissionAmount || 0),
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

module.exports = {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getUsers,
    updateUserRole,
    deleteUser,
};
