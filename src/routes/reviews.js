const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { validate, createReviewValidation } = require('../middlewares/validate');

const {
    createReview,
    getVenueReviews,
    myReviews,
} = require('../controllers/review.controller');

// POST /api/reviews - Create review
router.post('/', authenticate, validate(createReviewValidation), createReview);

// GET /api/reviews/venue/:venueId - Get venue reviews
router.get('/venue/:venueId', getVenueReviews);

// GET /api/reviews/my - Get current user's reviews
router.get('/my', authenticate, myReviews);

module.exports = router;
