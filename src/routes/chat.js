const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

const {
    listRooms,
    listRoomMessages,
    createOrGetDirectRoom,
    sendMessage,
} = require('../controllers/chat.controller');

// GET /api/chat/rooms - Get user's chat rooms
router.get('/rooms', authenticate, listRooms);

// GET /api/chat/rooms/:roomId/messages - Get messages in a room
router.get('/rooms/:roomId/messages', authenticate, listRoomMessages);

// POST /api/chat/rooms - Create or get direct chat room
router.post('/rooms', authenticate, createOrGetDirectRoom);

// POST /api/chat/rooms/:roomId/messages - Send message (REST fallback)
router.post('/rooms/:roomId/messages', authenticate, sendMessage);

module.exports = router;
