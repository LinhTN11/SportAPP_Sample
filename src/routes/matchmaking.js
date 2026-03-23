const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { validate, createMatchPostValidation } = require('../middlewares/validate');

const {
    createPost,
    searchPosts,
    myPosts,
    requestMatch,
    acceptRequest,
    rejectRequest,
    cancelRequest,
} = require('../controllers/matchmaking.controller');

// POST /api/matchmaking/posts - Create matchmaking post
router.post('/posts', authenticate, validate(createMatchPostValidation), createPost);

// GET /api/matchmaking/posts - Search matchmaking posts
router.get('/posts', searchPosts);

// GET /api/matchmaking/posts/my - My posts
router.get('/posts/my', authenticate, myPosts);

// POST /api/matchmaking/posts/:postId/request - Send match request
router.post('/posts/:postId/request', authenticate, requestMatch);

// POST /api/matchmaking/requests/:id/accept - Accept match request
router.post('/requests/:id/accept', authenticate, acceptRequest);

// POST /api/matchmaking/requests/:id/reject - Reject match request
router.post('/requests/:id/reject', authenticate, rejectRequest);

// POST /api/matchmaking/requests/:id/cancel - Cancel auto-matched (or own request)
router.post('/requests/:id/cancel', authenticate, cancelRequest);

module.exports = router;
