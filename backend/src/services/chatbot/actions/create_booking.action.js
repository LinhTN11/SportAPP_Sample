const { calculateTotalPrice, getUnavailableFieldIds, timeToMinutes } = require('../../bookingService');
const { resolveId } = require('../utils/resolver');

/**
 * Action: create_booking
 * Description: Primary action for creating a field booking.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'create_booking',
            description: 'Tạo booking đặt sân. Khi có đủ thông tin, BẮT BUỘC gọi tool này ngay lập tức.',
            parameters: {
                type: 'object',
                properties: {
                    fieldId: { type: 'string', description: 'ID sân con (UUID 36 ký tự)' },
                    bookingDate: { type: 'string', description: 'Ngày đặt (YYYY-MM-DD)' },
                    startTime: { type: 'string', description: 'Giờ bắt đầu (HH:mm)' },
                    endTime: { type: 'string', description: 'Giờ kết thúc (HH:mm)' },
                    paymentType: { type: 'string', enum: ['DEPOSIT', 'FULL'], description: 'Loại thanh toán: DEPOSIT (Đặt cọc), FULL (Thanh toán toàn bộ)' },
                },
                required: ['fieldId'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, userId, prisma }) => {
        const { fieldId, bookingDate, startTime, endTime, paymentType } = args;
        console.log('[Chatbot Action] Running create_booking with args:', JSON.stringify(args));
        const resolution = await resolveId(fieldId, prisma);

        if (resolution.type === 'venue') {
            const venue = resolution.data;
            const allFields = venue.fields || [];
            if (allFields.length === 0) return { success: false, message: 'Sân này hiện chưa có sân con nào khả dụng để đặt.' };

            // If only one field, auto-select it. Otherwise, return field selection UI.
            return {
                success: true,
                type: allFields.length > 1 ? 'options' : 'booking_form',
                data: {
                    fieldId: allFields[0].id,
                    fieldName: allFields[0].name,
                    venueId: venue.id,
                    venueName: venue.name,
                    openTime: venue.openTime,
                    closeTime: venue.closeTime,
                    pricingRules: allFields[0].pricingRules,
                    fields: allFields.map(f => ({ id: f.id, name: f.name, pricingRules: f.pricingRules })),
                    availableFields: allFields.map(f => ({ id: f.id, name: f.name })),
                    missingFields: ['date', 'startTime', 'time', 'payment'],
                    currentArgs: args
                }
            };
        }

        if (resolution.type !== 'field') {
            return { success: false, message: `Không tìm thấy sân với tên hoặc ID "${fieldId}". Vui lòng thử tìm kiếm tên chính xác hơn.` };
        }

        const field = resolution.data;

        // NEW: Check for missing data. If missing, show user-friendly form instead of text error
        const missing = [];
        if (!bookingDate) missing.push('date');
        if (!startTime) missing.push('startTime');
        if (!endTime && !args.duration) missing.push('time');
        if (!paymentType) missing.push('payment');

        if (missing.length > 0) {
            return {
                success: true,
                type: 'booking_form',
                data: {
                    fieldId: field.id,
                    fieldName: field.name,
                    venueName: field.venue.name,
                    openTime: field.venue.openTime,
                    closeTime: field.venue.closeTime,
                    pricingRules: field.pricingRules,
                    missingFields: missing,
                    currentArgs: args
                }
            };
        }

        try {
            // --- VALIDATION 1: Time Granularity (30-minute slots) ---
            const startM = timeToMinutes(startTime);
            const endM = timeToMinutes(endTime);
            if (startM % 30 !== 0 || endM % 30 !== 0) {
                return { success: false, message: 'Lịch đặt sân phải theo từng mốc 30 phút (Ví dụ: 17:00, 17:30). Vui lòng chọn lại giờ.' };
            }

            // --- VALIDATION 2: Business Hours ---
            const openM = timeToMinutes(field.venue.openTime || '00:00');
            const closeM = timeToMinutes(field.venue.closeTime || '23:59');
            if (startM < openM || endM > (closeM === 0 ? 1440 : closeM)) {
                return { success: false, message: `Thời gian đặt sân nằm ngoài giờ mở cửa của sân (${field.venue.openTime} - ${field.venue.closeTime}).` };
            }

            // --- VALIDATION 3: Overlap Check ---
            const unavailableIds = await getUnavailableFieldIds(bookingDate, startTime, endTime);
            if (unavailableIds.has(fieldId)) {
                return { success: false, message: `Khung giờ ${startTime} - ${endTime} ngày ${bookingDate} đã có người đặt hoặc đang chờ thanh toán. Vui lòng chọn khung giờ khác.` };
            }

            const totalPrice = await calculateTotalPrice(fieldId, bookingDate, startTime, endTime);
            const depositAmount = paymentType === 'FULL' ? totalPrice : (totalPrice * 0.1); 

            const booking = await prisma.booking.create({
                data: {
                    customerId: userId,
                    fieldId,
                    bookingDate: new Date(bookingDate),
                    startTime,
                    endTime,
                    totalPrice,
                    depositAmount,
                    commissionAmount: Number(totalPrice) * Number(field.venue.commissionRate || 0.05),
                    paymentMethod: 'DIRECT',
                    status: 'PENDING_DEPOSIT',
                },
            });

            return {
                success: true,
                type: 'booking_created',
                data: {
                    bookingId: booking.id,
                    venueName: field.venue.name,
                    fieldName: field.name,
                    date: bookingDate,
                    time: `${startTime} - ${endTime}`,
                    totalPrice,
                    depositAmount,
                },
            };
        } catch (error) {
            console.error('[Chatbot Action] Booking error:', error);
            return { success: false, message: error.message || 'Lỗi khi tạo booking' };
        }
    }
};
