/**
 * Action: get_owner_booking_summary
 * Description: Provides real-time statistics (revenue, count, status) for a venue owner.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_owner_booking_summary',
            description: 'TRA CỨU NHANH thống kê đơn đặt sân (số lượng, doanh thu) cho Chủ Sân. Dùng khi người dùng hỏi các câu như "hôm nay có bao nhiêu đơn", "doanh thu tuần này thế nào". Trả về text tóm tắt trực tiếp.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Ngày bắt đầu (YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'Ngày kết thúc (YYYY-MM-DD)' },
                    venueId: { type: 'string', description: 'ID sân cụ thể (tùy chọn)' },
                },
            },
        },
    },
    roles: ['OWNER', 'ADMIN'],
    execute: async ({ args, userId, userRole, prisma }) => {
        console.log(`[Action: get_owner_booking_summary] Executing for userId: ${userId}, role: ${userRole}, args:`, args);

        // 1. Get all venues owned by this user
        const ownerVenues = await prisma.venue.findMany({
            where: { ownerId: userId },
            select: { id: true }
        });
        const venueIds = ownerVenues.map(v => v.id);

        if (venueIds.length === 0 && userRole !== 'ADMIN') {
            console.log(`[Action: get_owner_booking_summary] User ${userId} owns no venues.`);
            return { success: true, type: 'owner_booking_summary', data: { totalCount: 0, totalRevenue: 0, statusCounts: {}, recentBookings: [] } };
        }

        const where = {
            field: {
                venueId: { in: venueIds }
            }
        };

        if (userRole === 'ADMIN') {
            delete where.field.venueId;
        }

        // 2. VALIDATE Venue ID: Only filter if the ID belongs to the owner
        if (args.venueId) {
            if (venueIds.includes(args.venueId) || userRole === 'ADMIN') {
                where.field.venueId = args.venueId;
            } else {
                console.warn(`[Action: get_owner_booking_summary] Provided venueId ${args.venueId} is INVALID or NOT OWNED. Using ALL venues instead.`);
                // Keep the default { in: venueIds }
            }
        }

        // 3. Date Filters: Default to a VERY broad range for "all-time"
        const sDate = args.startDate ? new Date(args.startDate) : new Date('2024-01-01');
        const eDate = args.endDate ? new Date(args.endDate) : new Date('2030-12-31'); // Far future for all-time
        eDate.setHours(23, 59, 59, 999);

        // Always apply some range to ensure Prisma query satisfies its constraints
        where.bookingDate = { gte: sDate, lte: eDate };

        console.log(`[Action: get_owner_booking_summary] Prisma where clause:`, JSON.stringify(where, null, 2));

        const bookings = await prisma.booking.findMany({
            where,
            include: { field: { include: { venue: true } } }
        });

        // Aggregate stats by time slot
        const slotStats = {};
        bookings.filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status)).forEach(b => {
            const slot = `${b.startTime}-${b.endTime}`;
            if (!slotStats[slot]) slotStats[slot] = { revenue: 0, count: 0 };
            slotStats[slot].revenue += Number(b.totalPrice);
            slotStats[slot].count += 1;
        });

        const stats = {
            totalCount: bookings.length,
            totalRevenue: bookings
                .filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status))
                .reduce((sum, b) => sum + Number(b.totalPrice), 0),
            successCount: bookings.filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status)).length,
            slotStats, // Detailed breakdown by time slot
            recentBookings: bookings
                .filter(b => ['CONFIRMED', 'COMPLETED'].includes(b.status)) // ONLY successful bookings to prevent noise
                .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
                .slice(0, 20)
                .map(b => {
                    const dateObj = new Date(b.bookingDate);
                    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                    return {
                        date: b.bookingDate.toISOString().split('T')[0],
                        day: days[dateObj.getDay()],
                        time: `${b.startTime}-${b.endTime}`,
                        status: b.status,
                        revenue: Number(b.totalPrice),
                        venue: b.field.venue.name
                    };
                }),
            statusCounts: {
                CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
                PENDING_DEPOSIT: bookings.filter(b => b.status === 'PENDING_DEPOSIT').length,
                COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
                CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
            },
            from: args.startDate,
            to: args.endDate
        };

        return { success: true, type: 'owner_booking_summary', data: stats };
    }
};
