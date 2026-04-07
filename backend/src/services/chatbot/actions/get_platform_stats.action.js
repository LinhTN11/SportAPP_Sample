/**
 * Action: get_platform_stats
 * Description: Real-time platform-wide statistics including total confirmed bookings and total revenue.
 * Available only to administrators.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_platform_stats',
            description: 'Xem thống kê tổng quan nền tảng. Chỉ dành cho Admin.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Ngày bắt đầu (YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'Ngày kết thúc (YYYY-MM-DD)' },
                },
            },
        },
    },
    roles: ['ADMIN'],
    execute: async ({ args, userRole, prisma }) => {
        if (userRole !== 'ADMIN') return { success: false, message: 'Chỉ Admin mới có quyền này!' };
        
        const nowDate = new Date().toISOString().split('T')[0];
        const sDateStr = args.startDate || nowDate;
        const eDateStr = args.endDate || nowDate;

        const sDate = new Date(sDateStr);
        const eDate = new Date(eDateStr);
        eDate.setHours(23, 59, 59, 999);

        const bookings = await prisma.booking.findMany({
            where: {
                bookingDate: { gte: sDate, lte: eDate },
                status: { in: ['CONFIRMED', 'COMPLETED', 'PENDING_DEPOSIT'] },
            },
        });

        const stats = {
            totalUsers: await prisma.user.count(),
            totalVenues: await prisma.venue.count({ where: { status: 'APPROVED' } }),
            totalBookings: bookings.length,
            totalRevenue: bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
            from: args.startDate,
            to: args.endDate,
        };

        return { success: true, type: 'platform_stats', data: stats };
    }
};
