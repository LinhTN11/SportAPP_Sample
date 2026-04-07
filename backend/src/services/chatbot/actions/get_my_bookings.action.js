/**
 * Action: get_my_bookings
 * Description: Fetches the current user's (customer) booking history.
 * Supports filtering by status (CONFIRMED, CANCELLED, etc.).
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_my_bookings',
            description: 'Xem danh sách booking của người dùng hiện tại.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Lọc theo trạng thái: PENDING_DEPOSIT, CONFIRMED, COMPLETED, CANCELLED' },
                },
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, userId, prisma }) => {
        try {
            console.log(`[Chatbot Action] get_my_bookings: user=${userId}, status=${args.status}`);

            const bookings = await prisma.booking.findMany({
                where: {
                    customerId: userId, // Corrected from userId
                    ...(args.status && args.status !== 'ALL' && { status: args.status }),
                },
                include: { field: { include: { venue: true } } },
                orderBy: { bookingDate: 'desc' },
                take: 10,
            });

            const results = bookings.map(b => ({
                id: b.id,
                venueName: b.field.venue.name,
                fieldName: b.field.name, // Corrected from b.name
                date: b.bookingDate.toISOString().split('T')[0],
                time: `${b.startTime} - ${b.endTime}`,
                totalPrice: b.totalPrice,
                status: b.status,
            }));

            return { success: true, type: 'bookings', data: results };
        } catch (error) {
            console.error('[Chatbot Action] get_my_bookings Error:', error);
            return { success: false, message: `Lỗi truy xuất lịch sử: ${error.message}` };
        }
    }
};
