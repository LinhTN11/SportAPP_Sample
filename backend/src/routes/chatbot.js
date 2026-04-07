const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { handleMessage, getWeather, downloadExport } = require('../controllers/chatbotController');

// All chatbot routes require authentication
router.use(authenticate);

// POST /api/chatbot/message - Send message to AI
router.post('/message', handleMessage);

// GET /api/chatbot/weather - Get weather data
router.get('/weather', getWeather);

// GET /api/chatbot/export/:filename - Download exported file
router.get('/export/:filename', downloadExport);

module.exports = router;
