const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

const {
    listNotifications,
    markRead,
    markReadAll,
} = require('../controllers/notification.controller');

// GET /api/notifications - Get user's notifications
router.get('/', authenticate, listNotifications);

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', authenticate, markRead);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, markReadAll);

module.exports = router;
