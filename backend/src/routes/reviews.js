const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { validate, createReviewValidation } = require('../middleware/validate');
const { createReview, getVenueReviews, getMyReviews } = require('../controllers/reviewController');

router.post('/', authenticate, validate(createReviewValidation), createReview);
router.get('/venue/:venueId', getVenueReviews);
router.get('/my', authenticate, getMyReviews);

module.exports = router;
