const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getRooms, getMessages, createRoom, sendMessage } = require('../controllers/chatController');

router.get('/rooms', authenticate, getRooms);
router.get('/rooms/:roomId/messages', authenticate, getMessages);
router.post('/rooms', authenticate, createRoom);
router.post('/rooms/:roomId/messages', authenticate, sendMessage);

module.exports = router;
