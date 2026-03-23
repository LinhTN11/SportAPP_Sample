const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middlewares/auth');
const { validate, createBookingValidation } = require('../middlewares/validate');
const { calculateTotalPrice, getUnavailableFieldIds } = require('../services/bookingService');

const {
    searchAvailableFields,
    createBooking,
    confirmBooking,
    cancelBooking,
    myBookings,
    venueBookings,
    fieldBookedSlots,
} = require('../controllers/booking.controller');

// ── Auto-expire bookings mỗi phút ──
setInterval(async () => {
    try {
        const result = await prisma.booking.updateMany({
            where: {
                status: 'PENDING_DEPOSIT',
                holdExpiresAt: { lt: new Date() },
            },
            data: { status: 'EXPIRED' },
        });
        if (result.count > 0) {
            console.log(`[AutoExpire] ${result.count} booking(s) expired`);
        }
    } catch (err) {
        console.error('[AutoExpire] Error:', err.message);
    }
}, 60 * 1000); // chạy mỗi 60 giây

// POST /api/bookings/search - Search available fields
router.post('/search', searchAvailableFields);

// POST /api/bookings - Create a booking (hold)
router.post('/', authenticate, validate(createBookingValidation), createBooking);

// POST /api/bookings/:id/confirm - Confirm booking after deposit
router.post('/:id/confirm', authenticate, confirmBooking);

// POST /api/bookings/:id/cancel - Cancel booking
router.post('/:id/cancel', authenticate, cancelBooking);

// GET /api/bookings/my - Customer's bookings
router.get('/my', authenticate, myBookings);

// GET /api/bookings/venue/:venueId - Owner's bookings for a venue
router.get('/venue/:venueId', authenticate, venueBookings);

// GET /api/bookings/field/:fieldId/slots?date=YYYY-MM-DD - Get booked time slots
router.get('/field/:fieldId/slots', fieldBookedSlots);

module.exports = router;
