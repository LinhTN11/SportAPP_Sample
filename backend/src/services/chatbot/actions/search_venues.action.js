const { normalizeSportType, normalizeCityName, haversineDistance } = require('../utils/helpers');

/**
 * Action: search_venues
 * Description: Finds sports venues based on criteria like sport type, city, and district.
 * Supports sorting by distance, rating, and price.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'search_venues',
            description: 'Tìm kiếm sân thể thao theo loại, thành phố, quận, và sắp xếp kết quả. Chỉ gọi khi đã biết rõ tiêu chí tìm kiếm (loại thể thao, cách sắp xếp).',
            parameters: {
                type: 'object',
                properties: {
                    sportType: { type: 'string', description: 'Loại thể thao: football, badminton, tennis, basketball, volleyball, pickleball' },
                    city: { type: 'string', description: 'Thành phố (CHỈ điền nếu người dùng nhắc đích danh tên thành phố, nếu không hãy để trống và để Tool tự tìm theo tọa độ GPS).' },
                    district: { type: 'string', description: 'Quận/huyện (CHỈ điền nếu người dùng nhắc đích danh, nếu không hãy để trống).' },
                    sortBy: { type: 'string', description: 'Cách sắp xếp: distance (mặc định nếu có tọa độ), rating, price_asc, price_desc.' },
                },
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, userLocation, prisma }) => {
        const normalizedSport = normalizeSportType(args.sportType);
        const normalizedCity = normalizeCityName(args.city);
        
        console.log(`[Chatbot Action] search_venues: sport=${normalizedSport}, city=${normalizedCity}, district=${args.district}, userLocation=${!!userLocation}`);

        const fieldWhere = { isActive: true };
        if (normalizedSport) {
            fieldWhere.sportType = { equals: normalizedSport, mode: 'insensitive' };
        }

        let results = [];
        let searchMethod = 'text';

        // 1. Radius-based search (Iterative) if User GPS is available
        if (userLocation && userLocation.lat && userLocation.lng) {
            searchMethod = 'radius';
            const radii = [10, 30, 50, 100]; // Radius steps in km
            
            for (const radius of radii) {
                console.log(`[Chatbot Action] Searching within ${radius}km...`);
                const venues = await prisma.venue.findMany({
                    where: { status: 'APPROVED' },
                    include: {
                        fields: { where: fieldWhere, include: { pricingRules: { where: { isActive: true } } } },
                        _count: { select: { reviews: true } },
                    },
                });

                const filtered = venues.filter(v => {
                    if (v.fields.length === 0) return false;
                    const dist = haversineDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude);
                    return dist <= radius;
                });

                if (filtered.length > 0) {
                    results = await processVenueResults(filtered, userLocation, prisma);
                    console.log(`[Chatbot Action] Found ${results.length} venues within ${radius}km.`);
                    break;
                }
            }
        }

        // 2. Text-based search (Fallback or if no GPS)
        if (results.length === 0) {
            searchMethod = 'text';
            const where = {
                status: 'APPROVED',
                ...(normalizedCity && { city: { contains: normalizedCity, mode: 'insensitive' } }),
                ...(args.district && { district: { contains: args.district, mode: 'insensitive' } }),
            };

            const venues = await prisma.venue.findMany({
                where,
                include: {
                    fields: { where: fieldWhere, include: { pricingRules: { where: { isActive: true } } } },
                    _count: { select: { reviews: true } },
                },
                take: 10,
                orderBy: { createdAt: 'desc' },
            });

            const venuesWithFields = venues.filter(v => v.fields.length > 0);
            results = await processVenueResults(venuesWithFields, userLocation, prisma);
        }

        // 3. Final Fallback: If still nothing, try searching by city only (ignoring district)
        if (results.length === 0 && (normalizedCity || args.district)) {
             const fallbackVenues = await prisma.venue.findMany({
                where: { 
                    status: 'APPROVED',
                    ...(normalizedCity && { city: { contains: normalizedCity, mode: 'insensitive' } }),
                },
                include: {
                    fields: { where: fieldWhere, include: { pricingRules: { where: { isActive: true } } } },
                    _count: { select: { reviews: true } },
                },
                take: 5
            });
            results = await processVenueResults(fallbackVenues.filter(v => v.fields.length > 0), userLocation, prisma);
        }

        // Sorting
        const sortBy = args.sortBy || (userLocation ? 'distance' : 'rating');
        if (sortBy === 'distance') results.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        else if (sortBy === 'rating') results.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
        else if (sortBy === 'price_asc') results.sort((a, b) => (a.minPrice ?? 999999) - (b.minPrice ?? 999999));
        else if (sortBy === 'price_desc') results.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));

        return { 
            success: true, 
            type: 'venues', 
            data: results.slice(0, 5), // Limit to 5 for the chatbot
            meta: { searchMethod, totalFound: results.length }
        };
    }
};

/**
 * Helper to process raw venue data into chatbot-friendly format
 */
async function processVenueResults(venues, userLocation, prisma) {
    return Promise.all(venues.map(async (v) => {
        const avg = await prisma.review.aggregate({ where: { venueId: v.id }, _avg: { rating: true } });
        const prices = v.fields.flatMap(f => f.pricingRules).map(r => Number(r.price)).filter(p => p > 0);
        const dist = userLocation ? haversineDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude) : null;
        return {
            id: v.id,
            name: v.name,
            address: v.address,
            city: v.city,
            district: v.district,
            sportTypes: v.sportTypes,
            images: v.images,
            openTime: v.openTime,
            closeTime: v.closeTime,
            avgRating: avg._avg.rating || 0,
            reviewCount: v._count.reviews,
            minPrice: prices.length > 0 ? Math.min(...prices) : null,
            fieldCount: v.fields.length,
            distance: dist ? Math.round(dist * 10) / 10 : null,
        };
    }));
}

