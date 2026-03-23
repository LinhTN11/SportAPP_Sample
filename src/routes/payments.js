const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

const {
    mockPay,
    getPaymentsByBooking,
} = require('../controllers/payment.controller');

// POST /api/payments/mock-pay - Mock payment endpoint
// Simulates a payment gateway callback
router.post('/mock-pay', authenticate, mockPay);

// GET /api/payments/booking/:bookingId - Get payments for a booking
router.get('/booking/:bookingId', authenticate, getPaymentsByBooking);

module.exports = router;
