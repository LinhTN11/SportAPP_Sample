const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { validate, createMatchPostValidation } = require('../middleware/validate');
const {
    createPost,
    searchPosts,
    getMyPosts,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
} = require('../controllers/matchmakingController');

router.post('/posts', authenticate, validate(createMatchPostValidation), createPost);
router.get('/posts', searchPosts);
router.get('/posts/my', authenticate, getMyPosts);
router.post('/posts/:postId/request', authenticate, sendRequest);
router.post('/requests/:id/accept', authenticate, acceptRequest);
router.post('/requests/:id/reject', authenticate, rejectRequest);
router.post('/requests/:id/cancel', authenticate, cancelRequest);

module.exports = router;
