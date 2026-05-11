const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { 
    getRooms, 
    getUnreadCount,
    getMessages, 
    createRoom, 
    sendMessage,
    suggestVenue,
    acceptVenueSuggestion,
    getRoomMatchInfo,
} = require('../controllers/chatController');

router.get('/rooms', authenticate, getRooms);
router.get('/unread-count', authenticate, getUnreadCount);
router.get('/rooms/:roomId/messages', authenticate, getMessages);
router.get('/rooms/:roomId/match-info', authenticate, getRoomMatchInfo);
router.post('/rooms', authenticate, createRoom);
router.post('/rooms/:roomId/messages', authenticate, sendMessage);
router.post('/rooms/:roomId/suggest-venue', authenticate, suggestVenue);
router.post('/messages/:messageId/accept-suggestion', authenticate, acceptVenueSuggestion);

module.exports = router;
