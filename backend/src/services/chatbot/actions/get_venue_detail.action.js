/**
 * Action: get_venue_detail
 * Description: Retrieves complete details for a venue, including fields, pricing, and reviews.
 * Also handles field-to-venue ID resolution.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_venue_detail',
            description: 'Xem chi tiết một sân: giá, giờ mở cửa, đánh giá, sân con.',
            parameters: {
                type: 'object',
                properties: {
                    venueId: { type: 'string', description: 'ID của sân' },
                },
                required: ['venueId'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, prisma }) => {
        let resolvedVenueId = args.venueId;
        console.log(`[Chatbot Action] get_venue_detail: id=${resolvedVenueId}`);

        let venue = await prisma.venue.findUnique({
            where: { id: resolvedVenueId },
            include: {
                fields: { where: { isActive: true }, include: { pricingRules: { where: { isActive: true } } } },
                reviews: { include: { user: { select: { fullName: true } } }, take: 5, orderBy: { createdAt: 'desc' } },
            },
        });

        // Fallback: Check if the ID provided is actually a field ID
        if (!venue) {
            const field = await prisma.field.findUnique({ where: { id: resolvedVenueId } });
            if (field) {
                resolvedVenueId = field.venueId;
                venue = await prisma.venue.findUnique({
                    where: { id: resolvedVenueId },
                    include: {
                        fields: { where: { id: field.id, isActive: true }, include: { pricingRules: { where: { isActive: true } } } },
                        reviews: { include: { user: { select: { fullName: true } } }, take: 5, orderBy: { createdAt: 'desc' } },
                    },
                });
            }
        }

        if (!venue) return { success: false, message: 'Không tìm thấy sân (ID không hợp lệ)' };

        const avg = await prisma.review.aggregate({ where: { venueId: venue.id }, _avg: { rating: true }, _count: true });

        return {
            success: true,
            type: 'venue_detail',
            data: {
                ...venue,
                avgRating: avg._avg.rating || 0,
                reviewCount: avg._count,
            },
        };
    }
};
