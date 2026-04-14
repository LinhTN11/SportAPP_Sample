const { normalizeSportType, normalizeCityName, haversineDistance } = require('../utils/helpers');
const { rankByContainment, fuzzySearch, normalizeSearchText } = require('../utils/fuzzySearch');

const CANONICAL_SPORTS = new Set(['football', 'badminton', 'tennis', 'basketball', 'volleyball', 'pickleball']);

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
            description: 'Tìm kiếm và liệt kê các sân thể thao. Hãy gọi ngay khi người dùng bày tỏ nhu cầu tìm chỗ chơi hoặc hỏi sân ở đâu. Nếu thiếu môn thể thao, hãy để trống hoặc hỏi lại.',
            parameters: {
                type: 'object',
                properties: {
                    sportType: { type: 'string', description: 'Loại thể thao: football, badminton, tennis, basketball, volleyball, pickleball' },
                    name: { type: 'string', description: 'Tên sân cụ thể người dùng muốn tìm (ví dụ: "Phú Nhuận", "Bách Khoa").' },
                    city: { type: 'string', description: 'Thành phố (VD: Hà Nội, TP.HCM). Điền nếu người dùng nhắc đích danh, nếu không hãy để trống.' },
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
        if (normalizedSport && CANONICAL_SPORTS.has(normalizedSport)) {
            fieldWhere.sportType = { equals: normalizedSport, mode: 'insensitive' };
        }

        const fieldWhereNoSport = { isActive: true };

        let results = [];
        let searchMethod = 'text';

        // 0. Name-based search (Priority, with fuzzy fallback)
        if (args.name) {
            searchMethod = 'name';
            const searchName = normalizeSearchText(args.name);
            const directMatches = await prisma.venue.findMany({
                where: {
                    status: 'APPROVED',
                    name: { contains: args.name, mode: 'insensitive' }
                },
                include: {
                    fields: { where: fieldWhereNoSport, include: { pricingRules: { where: { isActive: true } } } },
                    _count: { select: { reviews: true } },
                },
                take: 8
            });

            let mergedVenues = directMatches.filter(v => v.fields.length > 0);

            if (mergedVenues.length === 0) {
                const candidates = await prisma.venue.findMany({
                    where: { status: 'APPROVED' },
                    select: { id: true, name: true, city: true, district: true },
                    take: 500,
                });

                const byContains = rankByContainment(searchName, candidates, 'name').map(v => ({ ...v, __score: 0 }));
                const byFuzzy = fuzzySearch(searchName, candidates, {
                    keys: ['name', 'city', 'district'],
                    threshold: 0.38,
                    limit: 5,
                });

                const ranked = [...byContains, ...byFuzzy]
                    .sort((a, b) => (a.__score ?? 1) - (b.__score ?? 1));

                const directIds = new Set(mergedVenues.map(v => v.id));
                const fuzzyIds = [];

                for (const item of ranked) {
                    if (directIds.has(item.id) || fuzzyIds.includes(item.id)) continue;
                    fuzzyIds.push(item.id);
                    if (fuzzyIds.length >= 8) break;
                }

                if (fuzzyIds.length > 0) {
                    const fuzzyVenues = await prisma.venue.findMany({
                        where: { id: { in: fuzzyIds }, status: 'APPROVED' },
                        include: {
                            fields: { where: fieldWhereNoSport, include: { pricingRules: { where: { isActive: true } } } },
                            _count: { select: { reviews: true } },
                        },
                    });

                    const fuzzyById = new Map(fuzzyVenues.filter(v => v.fields.length > 0).map(v => [v.id, v]));
                    const orderedFuzzy = fuzzyIds.map(id => fuzzyById.get(id)).filter(Boolean);
                    mergedVenues = [...mergedVenues, ...orderedFuzzy];
                    if (orderedFuzzy.length > 0) searchMethod = 'name_fuzzy';
                }
            }

            results = await processVenueResults(mergedVenues, userLocation, prisma);

            if (results.length === 0) {
                return {
                    success: true,
                    type: 'venues',
                    data: [],
                    meta: {
                        searchMethod: 'name_not_found',
                        query: args.name,
                    },
                };
            }
        }

        // 1. Radius-based search (Iterative) if User GPS is available
        if (results.length === 0 && userLocation && userLocation.lat && userLocation.lng) {
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

