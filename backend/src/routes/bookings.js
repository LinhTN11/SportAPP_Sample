const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { validate, createBookingValidation } = require('../middleware/validate');
const {
    searchFields,
    createBooking,
    confirmBooking,
    cancelBooking,
    getMyBookings,
    getVenueBookings,
    getFieldSlots,
} = require('../controllers/bookingController');

router.post('/search', searchFields);
router.post('/', authenticate, validate(createBookingValidation), createBooking);
router.post('/:id/confirm', authenticate, confirmBooking);
router.post('/:id/cancel', authenticate, cancelBooking);
router.get('/my', authenticate, getMyBookings);
router.get('/venue/:venueId', authenticate, getVenueBookings);
router.get('/field/:fieldId/slots', getFieldSlots);

module.exports = router;
