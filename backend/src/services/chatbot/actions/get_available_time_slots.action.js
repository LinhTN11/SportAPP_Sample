const { getUnavailableFieldIds } = require('../../bookingService');
const { resolveId } = require('../utils/resolver');

/**
 * Action: get_available_time_slots
 * Description: Checks for available booking slots (1-hour segments).
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_available_time_slots',
            description: 'KIỂM TRA GIỜ TRỐNG cho một sân cụ thể trong một ngày.',
            parameters: {
                type: 'object',
                properties: {
                    venueId: { type: 'string', description: 'ID của sân chung hoặc sân con' },
                    date: { type: 'string', description: 'Ngày muốn kiểm tra (YYYY-MM-DD)' },
                },
                required: ['venueId'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, prisma }) => {
        const { venueId, date } = args;
        const resolution = await resolveId(venueId, prisma);

        let fields = [];
        let venue = null;

        if (resolution.type === 'field') {
            fields = [resolution.data];
            venue = resolution.data.venue;
        } else if (resolution.type === 'venue') {
            venue = resolution.data;
            // ALWAYS trigger clarification for Venue IDs - even for single-court venues
            // Use only the name as the label to keep the UI clean
            return {
                success: true,
                type: 'clarification',
                data: {
                    question: `Vui lòng chọn sân con cụ thể tại "${venue.name}" để xem lịch trống:`,
                    options: venue.fields.map(f => f.name), // Simplified for AI
                    fields: venue.fields.map(f => ({ id: f.id, name: f.name })), // Full data for UI
                    originalArgs: args
                }
            };
        }

        if (!venue || fields.length === 0) {
            return { success: false, message: 'ID không hợp lệ hoặc không có sân khả dụng.' };
        }

        // 3. 30-min slots from openTime to closeTime using .has() on Set
        const slots = [];
        const [openH, openM] = venue.openTime.split(':').map(Number);
        const [closeH, closeM] = venue.closeTime.split(':').map(Number);

        const openMin = openH * 60 + openM;
        const closeMin = closeH * 60 + closeM;

        for (let m = openMin; m < closeMin; m += 30) {
            const startH = Math.floor(m / 60).toString().padStart(2, '0');
            const startM = (m % 60).toString().padStart(2, '0');
            const endH = Math.floor((m + 30) / 60).toString().padStart(2, '0');
            const endM = ((m + 30) % 60).toString().padStart(2, '0');
            
            const start = `${startH}:${startM}`;
            const end = `${endH}:${endM}`;
            const unavail = await getUnavailableFieldIds(date, start, end);
            
            const available = fields.filter(f => !unavail.has(f.id));
            if (available.length > 0) {
                slots.push({ time: `${start}-${end}`, availableFields: available.map(f => f.name) });
            }
        }

        return { success: true, type: 'available_slots', data: { date, slots } };
    }
};
