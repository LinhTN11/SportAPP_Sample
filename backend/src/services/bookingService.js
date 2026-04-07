const prisma = require('./chatbot/utils/prisma');

/**
 * Get set of field IDs that are unavailable (booked) for a given date/time range
 */
async function getUnavailableFieldIds(bookingDate, startTime, endTime) {
    const date = new Date(bookingDate);
    if (isNaN(date.getTime())) return new Set();

    const bookings = await prisma.booking.findMany({
        where: {
            bookingDate: date,
            status: { in: ['PENDING_DEPOSIT', 'CONFIRMED'] },
            // Time overlap: existing.start < new.end AND existing.end > new.start
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
            ],
        },
        select: { fieldId: true },
    });

    const bookedFieldIds = new Set(bookings.map(b => b.fieldId));

    // Also find fields that are children/parents of booked fields
    if (bookedFieldIds.size > 0) {
        // Find parents of booked children
        const parentComposites = await prisma.fieldComposite.findMany({
            where: { childFieldId: { in: Array.from(bookedFieldIds) } },
            select: { parentFieldId: true },
        });
        parentComposites.forEach(c => bookedFieldIds.add(c.parentFieldId));

        // Find children of booked parents
        const childComposites = await prisma.fieldComposite.findMany({
            where: { parentFieldId: { in: Array.from(bookedFieldIds) } },
            select: { childFieldId: true },
        });
        childComposites.forEach(c => bookedFieldIds.add(c.childFieldId));
    }

    return bookedFieldIds;
}

/**
 * Calculate total price for a booking based on pricing rules
 */
async function calculateTotalPrice(fieldId, bookingDate, startTime, endTime) {
    const date = new Date(bookingDate);
    if (isNaN(date.getTime())) {
        throw new Error('Ngày đặt sân không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.');
    }
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...

    const rules = await prisma.fieldPricingRule.findMany({
        where: {
            fieldId,
            isActive: true,
        },
        orderBy: { startTime: 'asc' },
    });

    if (rules.length === 0) {
        throw new Error('No pricing rules found for this field');
    }

    let totalPrice = 0;
    let bookStart = timeToMinutes(startTime);
    let bookEnd = timeToMinutes(endTime);

    if (bookEnd <= bookStart) {
        bookEnd += 24 * 60;
    }

    // For each pricing rule, calculate overlap with booking time
    for (const rule of rules) {
        // Check if this rule applies to the day of week
        if (rule.dayOfWeek.length > 0 && !rule.dayOfWeek.includes(dayOfWeek)) {
            continue;
        }

        let ruleStart = timeToMinutes(rule.startTime);
        let ruleEnd = timeToMinutes(rule.endTime);

        if (ruleEnd <= ruleStart) {
            ruleEnd += 24 * 60;
        }

        // We perfectly handle midnight crossing by testing 3 shifts of the rule interval
        const ruleIntervals = [
            { start: ruleStart - 24 * 60, end: ruleEnd - 24 * 60 },
            { start: ruleStart, end: ruleEnd },
            { start: ruleStart + 24 * 60, end: ruleEnd + 24 * 60 }
        ];

        for (const interval of ruleIntervals) {
            const overlapStart = Math.max(bookStart, interval.start);
            const overlapEnd = Math.min(bookEnd, interval.end);

            if (overlapStart < overlapEnd) {
                const overlapHours = (overlapEnd - overlapStart) / 60;
                totalPrice += overlapHours * Number(rule.price);
            }
        }
    }

    if (totalPrice === 0) {
        // Fallback: use the first matching rule for the entire duration
        const matchingRule = rules.find(r =>
            r.dayOfWeek.length === 0 || r.dayOfWeek.includes(dayOfWeek)
        );
        if (matchingRule) {
            const hours = (bookEnd - bookStart) / 60;
            totalPrice = hours * Number(matchingRule.price);
        }
    }

    return Math.round(totalPrice);
}

/**
 * Convert "HH:mm" to minutes since midnight
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

module.exports = {
    getUnavailableFieldIds,
    calculateTotalPrice,
    timeToMinutes,
};
