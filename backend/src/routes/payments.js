const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { mockPay, getBookingPayments } = require('../controllers/paymentController');

router.post('/mock-pay', authenticate, mockPay);
router.get('/booking/:bookingId', authenticate, getBookingPayments);

module.exports = router;
