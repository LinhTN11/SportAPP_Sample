const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createVenueValidation } = require('../middleware/validate');
const {
    createVenue,
    listVenues,
    getVenue,
    updateVenue,
    getMyVenues,
    deleteVenue,
    approveVenue,
    rejectVenue,
    getPendingVenues,
} = require('../controllers/venueController');

// Owner routes
router.post('/', authenticate, authorize('OWNER'), validate(createVenueValidation), createVenue);
router.get('/owner/my-venues', authenticate, authorize('OWNER'), getMyVenues);
router.put('/:id', authenticate, authorize('OWNER'), updateVenue);
router.delete('/:id', authenticate, authorize('OWNER'), deleteVenue);

// Admin routes
router.get('/admin/pending', authenticate, authorize('ADMIN'), getPendingVenues);
router.post('/:id/approve', authenticate, authorize('ADMIN'), approveVenue);
router.post('/:id/reject', authenticate, authorize('ADMIN'), rejectVenue);

// Public routes
router.get('/', listVenues);
router.get('/:id', getVenue);

module.exports = router;
