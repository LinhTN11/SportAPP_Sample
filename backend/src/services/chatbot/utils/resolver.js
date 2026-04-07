/**
 * resolver.js
 * Centralized ID resolution for chatbot actions.
 * Resolves whether an ID belongs to a Field or a Venue.
 */
async function resolveId(id, prisma) {
    if (!id) return { type: 'none' };

    // 1. Try Field (Sân con)
    const field = await prisma.field.findUnique({
        where: { id, isActive: true },
        include: { 
            venue: true,
            pricingRules: { where: { isActive: true } }
        }
    });
    if (field) return { type: 'field', data: field };

    // 2. Try Venue (Sân lớn)
    const venue = await prisma.venue.findUnique({
        where: { id },
        include: { 
            fields: { 
                where: { isActive: true },
                include: { pricingRules: { where: { isActive: true } } }
            } 
        }
    });
    if (venue) return { type: 'venue', data: venue };

    return { type: 'unknown' };
}

module.exports = { resolveId };
