const { sendMessage } = require('../services/chatbotService');
const { getWeatherForCity } = require('../services/weatherService');
const path = require('path');
const fs = require('fs');

const EXPORTS_DIR = path.join(__dirname, '../../exports');

/**
 * POST /api/chatbot/message
 * Send a message to the AI chatbot
 */
const handleMessage = async (req, res, next) => {
    try {
        const { message, history = [], location = null, venueId = null } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const result = await sendMessage(message.trim(), req.user, history, location, venueId);

        res.json({
            success: true,
            data: {
                message: result.message,
                contextMessage: result.contextMessage || result.message,
                toolResults: result.toolResults || [],
                error: result.error || false,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/chatbot/weather
 * Get current weather data
 */
const getWeather = async (req, res, next) => {
    try {
        const { city } = req.query;
        const weather = await getWeatherForCity(city || null);

        if (!weather) {
            return res.status(503).json({
                success: false,
                message: 'Không thể lấy dữ liệu thời tiết',
            });
        }

        res.json({ success: true, data: weather });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/chatbot/export/:filename
 * Download an exported file
 */
const downloadExport = async (req, res, next) => {
    try {
        const { filename } = req.params;

        // Sanitize filename to prevent path traversal
        const sanitized = path.basename(filename);
        const filepath = path.join(EXPORTS_DIR, sanitized);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ success: false, message: 'File không tồn tại' });
        }

        const ext = path.extname(sanitized).toLowerCase();
        const contentTypes = {
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitized}"`);
        res.sendFile(filepath);
    } catch (error) {
        next(error);
    }
};

module.exports = { handleMessage, getWeather, downloadExport };
