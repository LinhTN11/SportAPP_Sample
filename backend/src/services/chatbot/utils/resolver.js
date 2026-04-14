const { rankByContainment, fuzzySearch } = require('./fuzzySearch');

/**
 * Resolves an entity ID or Name into its data.
 * @param {string} input - UUID or Name string
 */
async function resolveId(input, prisma) {
    if (!input) return { type: 'none' };

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

    if (isUUID) {
        // 1. Try Field
        const field = await prisma.field.findUnique({
            where: { id: input, isActive: true },
            include: { venue: true, pricingRules: { where: { isActive: true } } }
        });
        if (field) return { type: 'field', data: field };

        // 2. Try Venue
        const venue = await prisma.venue.findUnique({
            where: { id: input },
            include: { 
                fields: { 
                    where: { isActive: true },
                    include: { pricingRules: { where: { isActive: true } } }
                } 
            }
        });
        if (venue) return { type: 'venue', data: venue };
    }

    // 3. Direct text match before fuzzy fallback
    const venueByName = await prisma.venue.findFirst({
        where: { name: { contains: input, mode: 'insensitive' }, status: 'APPROVED' },
        include: { 
            fields: { 
                where: { isActive: true },
                include: { pricingRules: { where: { isActive: true } } }
            } 
        }
    });
    if (venueByName) return { type: 'venue', data: venueByName };

    const fieldByName = await prisma.field.findFirst({
        where: { name: { contains: input, mode: 'insensitive' }, isActive: true },
        include: { venue: true, pricingRules: { where: { isActive: true } } }
    });
    if (fieldByName) return { type: 'field', data: fieldByName };

    // 4. True fuzzy matching (typos/variants)
    const venueCandidates = await prisma.venue.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true, city: true, district: true },
        take: 500
    });

    const fieldCandidates = await prisma.field.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            venue: { select: { name: true, city: true, district: true } }
        },
        take: 1000
    });

    const rankedVenueContains = rankByContainment(input, venueCandidates, 'name');
    const venueFuzzy = rankedVenueContains.length > 0
        ? rankedVenueContains.slice(0, 1).map(v => ({ ...v, __score: 0 }))
        : fuzzySearch(input, venueCandidates, {
            keys: ['name', 'city', 'district'],
            threshold: 0.35,
            limit: 3,
        });

    const normalizedFieldCandidates = fieldCandidates.map(f => ({
        id: f.id,
        name: f.name,
        venueName: f.venue?.name || '',
        city: f.venue?.city || '',
        district: f.venue?.district || '',
    }));

    const rankedFieldContains = rankByContainment(input, normalizedFieldCandidates, 'name');
    const fieldFuzzy = rankedFieldContains.length > 0
        ? rankedFieldContains.slice(0, 1).map(f => ({ ...f, __score: 0 }))
        : fuzzySearch(input, normalizedFieldCandidates, {
            keys: ['name', 'venueName', 'city', 'district'],
            threshold: 0.35,
            limit: 3,
        });

    const bestVenue = venueFuzzy[0];
    const bestField = fieldFuzzy[0];

    if (!bestVenue && !bestField) return { type: 'unknown' };

    if (bestVenue && (!bestField || bestVenue.__score <= bestField.__score)) {
        const fuzzyVenue = await prisma.venue.findUnique({
            where: { id: bestVenue.id },
            include: {
                fields: {
                    where: { isActive: true },
                    include: { pricingRules: { where: { isActive: true } } }
                }
            }
        });
        if (fuzzyVenue) return { type: 'venue', data: fuzzyVenue };
    }

    if (bestField) {
        const fuzzyField = await prisma.field.findUnique({
            where: { id: bestField.id },
            include: { venue: true, pricingRules: { where: { isActive: true } } }
        });
        if (fuzzyField) return { type: 'field', data: fuzzyField };
    }

    return { type: 'unknown' };
}

module.exports = { resolveId };
