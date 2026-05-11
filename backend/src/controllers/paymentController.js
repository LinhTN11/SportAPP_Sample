const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/payments/mock-pay
const mockPay = async (req, res, next) => {
    try {
        const { bookingId, method, simulateSuccess } = req.body;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { field: { include: { venue: true } } },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.customerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (booking.status !== 'PENDING_DEPOSIT') {
            return res.status(400).json({ success: false, message: 'Payment not expected for this booking' });
        }

        if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'EXPIRED' },
            });
            return res.status(410).json({ success: false, message: 'Hold expired' });
        }

        const success = simulateSuccess !== false;
        const paymentAmount = booking.paymentMethod === 'ONLINE'
            ? booking.totalPrice
            : booking.depositAmount;

        const payment = await prisma.payment.create({
            data: {
                bookingId: booking.id,
                amount: paymentAmount,
                type: booking.paymentMethod === 'ONLINE' ? 'FULL_PAYMENT' : 'DEPOSIT',
                method: method || 'MOCK_VNPAY',
                status: success ? 'SUCCESS' : 'FAILED',
                transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            },
        });

        if (success) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'CONFIRMED' },
            });

            await prisma.notification.create({
                data: {
                    userId: booking.customerId,
                    type: 'PAYMENT_SUCCESS',
                    title: 'Payment successful!',
                    body: `Your payment of ${Number(paymentAmount).toLocaleString('vi-VN')}đ has been confirmed.`,
                    data: { bookingId: booking.id, paymentId: payment.id },
                },
            });

            await prisma.notification.create({
                data: {
                    userId: booking.field.venue.ownerId,
                    type: 'BOOKING_CONFIRMED',
                    title: 'New booking confirmed!',
                    body: `A customer booked ${booking.field.name} on ${booking.bookingDate.toISOString().split('T')[0]}`,
                    data: { bookingId: booking.id },
                },
            });

            return res.json({
                success: true,
                message: 'Payment successful. Booking confirmed.',
                data: { payment, bookingStatus: 'CONFIRMED' },
            });
        } else {
            await prisma.notification.create({
                data: {
                    userId: booking.customerId,
                    type: 'PAYMENT_FAILED',
                    title: 'Payment failed',
                    body: `Your payment failed. Please try again before the hold expires.`,
                    data: { bookingId: booking.id },
                },
            });

            return res.json({
                success: false,
                message: 'Payment failed. Please try again.',
                data: { payment, bookingStatus: 'PENDING_DEPOSIT' },
            });
        }
    } catch (error) {
        next(error);
    }
};

// GET /api/payments/booking/:bookingId
const getBookingPayments = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.bookingId },
            include: { field: { include: { venue: true } } },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const isCustomer = booking.customerId === req.user.id;
        const isOwner = booking.field.venue.ownerId === req.user.id;
        if (!isCustomer && !isOwner && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const payments = await prisma.payment.findMany({
            where: { bookingId: req.params.bookingId },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { payments } });
    } catch (error) {
        next(error);
    }
};

module.exports = { mockPay, getBookingPayments };
