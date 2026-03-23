const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, createVenueValidation } = require('../middlewares/validate');

const {
    createVenue,
    listVenues,
    getVenueById,
    updateVenue,
    ownerMyVenues,
    deleteVenue,
    adminApproveVenue,
    adminRejectVenue,
    adminListPendingVenues,
} = require('../controllers/venue.controller');

// POST /api/venues - Owner creates a venue
router.post('/', authenticate, authorize('OWNER'), validate(createVenueValidation), createVenue);

// GET /api/venues - List venues (public)
router.get('/', listVenues);

// GET /api/venues/:id - Get venue details
router.get('/:id', getVenueById);

// PUT /api/venues/:id - Owner updates venue
router.put('/:id', authenticate, authorize('OWNER'), updateVenue);

// GET /api/venues/owner/my-venues - Owner's venues
router.get('/owner/my-venues', authenticate, authorize('OWNER'), ownerMyVenues);

// DELETE /api/venues/:id - Owner deletes venue
router.delete('/:id', authenticate, authorize('OWNER'), deleteVenue);

// POST /api/venues/:id/approve - Admin approves venue
router.post('/:id/approve', authenticate, authorize('ADMIN'), adminApproveVenue);

// POST /api/venues/:id/reject - Admin rejects venue
router.post('/:id/reject', authenticate, authorize('ADMIN'), adminRejectVenue);

// GET /api/venues/admin/pending - Admin list pending venues
router.get('/admin/pending', authenticate, authorize('ADMIN'), adminListPendingVenues);

module.exports = router;
