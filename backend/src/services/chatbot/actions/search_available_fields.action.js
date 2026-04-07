const { normalizeSportType, normalizeCityName } = require('../utils/helpers');
const { getUnavailableFieldIds } = require('../../bookingService');

/**
 * Action: search_available_fields
 * Description: Finds vacant fields for a specific date and time range. 
 * Can filter by venueId or location (city/district).
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'search_available_fields',
            description: 'Tìm sân trống theo ngày giờ cụ thể. Trả về danh sách sân có slot trống.',
            parameters: {
                type: 'object',
                properties: {
                    sportType: { type: 'string' },
                    city: { type: 'string' },
                    district: { type: 'string' },
                    venueId: { type: 'string' },
                    bookingDate: { type: 'string' },
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                },
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, prisma }) => {
        const normalizedSport = normalizeSportType(args.sportType);
        const normalizedCity = normalizeCityName(args.city);
        
        console.log(`[Chatbot Action] search_available_fields: sport=${normalizedSport}, date=${args.bookingDate}`);

        let resolvedVenueId = args.venueId;
        let targetFieldId = null;
        if (resolvedVenueId) {
            const venue = await prisma.venue.findUnique({ where: { id: resolvedVenueId } });
            if (!venue) {
                const field = await prisma.field.findUnique({ where: { id: resolvedVenueId } });
                if (field) {
                    resolvedVenueId = field.venueId;
                    targetFieldId = field.id;
                }
            }
        }

        const where = {
            status: 'APPROVED',
            ...(resolvedVenueId && { id: resolvedVenueId }),
            ...(!resolvedVenueId && normalizedCity && { city: { contains: normalizedCity, mode: 'insensitive' } }),
            ...(!resolvedVenueId && args.district && { district: { contains: args.district, mode: 'insensitive' } }),
        };

        const fieldWhere = { isActive: true };
        if (targetFieldId) fieldWhere.id = targetFieldId;
        if (!targetFieldId && normalizedSport) {
            fieldWhere.sportType = { equals: normalizedSport, mode: 'insensitive' };
        }

        const venues = await prisma.venue.findMany({
            where,
            include: { fields: { where: fieldWhere, include: { pricingRules: { where: { isActive: true } } } } },
        });

        let unavailableIds = new Set();
        if (args.bookingDate && args.startTime && args.endTime) {
            unavailableIds = await getUnavailableFieldIds(args.bookingDate, args.startTime, args.endTime);
        }

        const results = venues.flatMap(v => v.fields.map(f => {
            if (unavailableIds.has(f.id)) return null;
            return {
                venueId: v.id, venueName: v.name, address: v.address,
                fieldId: f.id, fieldName: f.name, sportType: f.sportType,
                pricing: f.pricingRules, openTime: v.openTime, closeTime: v.closeTime,
            };
        })).filter(Boolean);

        return { success: true, type: 'available_fields', data: results };
    }
};
