/**
 * Action: get_owner_venues
 * Description: Lists all venues owned by the current user with their IDs.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_owner_venues',
            description: 'LIỆT KÊ danh sách các sân bạn sở hữu kèm theo Tên và ID (UUID). Dùng khi AI cần biết ID chính xác của một sân để tra cứu số liệu chi tiết.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    roles: ['OWNER', 'ADMIN'],
    execute: async ({ userId, userRole, prisma }) => {
        try {
            const where = { ownerId: userId };
            if (userRole === 'ADMIN') delete where.ownerId; // Admin sees all

            const venues = await prisma.venue.findMany({
                where,
                select: { id: true, name: true, address: true, city: true }
            });

            return { success: true, type: 'owner_venues', data: venues };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};
