/**
 * Action: get_top_owners
 * Description: Retrieves high-performing venue owners ranked by total revenue confirmed across their properties.
 * Restricted to administrators only.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_top_owners',
            description: 'Xem bảng xếp hạng các chủ sân có doanh thu cao nhất. Chỉ dành cho Admin.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'Số lượng chủ sân muốn xem (mặc định 5)' },
                    startDate: { type: 'string', description: 'Ngày bắt đầu (YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'Ngày kết thúc (YYYY-MM-DD)' },
                },
            },
        },
    },
    roles: ['ADMIN'],
    execute: async ({ args, userRole, prisma }) => {
        if (userRole !== 'ADMIN') return { success: false, message: 'Chỉ Admin mới có quyền này!' };
        
        const limit = args.limit || 5;
        const sDate = args.startDate ? new Date(args.startDate) : null;
        const eDate = args.endDate ? new Date(args.endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

        // Aggregate confirmed/completed revenue grouped by owner
        const bookings = await prisma.booking.findMany({
            where: {
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                ...(sDate && eDate && { bookingDate: { gte: sDate, lte: eDate } }),
            },
            include: {
                field: {
                    include: {
                        venue: {
                            include: {
                                owner: { select: { fullName: true, id: true } }
                            }
                        }
                    }
                }
            }
        });

        const ownerMap = new Map();
        for (const b of bookings) {
            const owner = b.field.venue.owner;
            if (!owner) continue;

            const current = ownerMap.get(owner.id) || { name: owner.fullName, revenue: 0, bookingCount: 0 };
            current.revenue += Number(b.totalPrice);
            current.bookingCount += 1;
            ownerMap.set(owner.id, current);
        }

        const sortedOwners = Array.from(ownerMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        return { success: true, type: 'top_owners', data: sortedOwners };
    }
};
