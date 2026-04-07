/**
 * Action: cancel_booking
 * Description: Logic for cancelling an existing booking. 
 * Includes validation to ensure the booking exists.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'cancel_booking',
            description: 'Hủy một booking của người dùng.',
            parameters: {
                type: 'object',
                properties: {
                    bookingId: { type: 'string', description: 'ID của booking cần hủy (UUID 36 ký tự)' },
                },
                required: ['bookingId'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args, prisma }) => {
        const { bookingId } = args;
        console.log(`[Chatbot Action] cancel_booking: id=${bookingId}`);

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) return { success: false, message: 'ID đặt sân không tồn tại trong hệ thống.' };

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });

        return { success: true, type: 'booking_cancelled', message: 'Đã hủy đơn thành công!' };
    }
};
