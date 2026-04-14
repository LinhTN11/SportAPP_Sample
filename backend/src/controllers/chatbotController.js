const { sendMessage } = require('../services/chatbotService');
const { getWeatherForCity } = require('../services/weatherService');
const path = require('path');
const fs = require('fs');
const prisma = require('../services/chatbot/utils/prisma');
const registry = require('../services/chatbot/core/Registry');
const responseFormatter = require('../services/chatbot/formatters/ResponseFormatter');
const {
    sanitizeAssistantText,
    extractToolCallsFromText,
    normalizeToolArgs,
} = require('../services/chatbot/utils/toolCallFallback');

const EXPORTS_DIR = path.join(__dirname, '../../exports');

async function recoverToolResultsFromRawMessage(messageText, user, location) {
    const parsedCalls = extractToolCallsFromText(messageText);
    if (parsedCalls.length === 0) return null;

    const executed = await Promise.all(parsedCalls.map(async (call, idx) => {
        const toolName = call.name;
        const toolArgs = normalizeToolArgs(toolName, call.arguments || {});

        const result = await registry.executeAction(toolName, {
            args: toolArgs,
            userId: user.id,
            userRole: user.role,
            userLocation: location,
            prisma,
        });

        return {
            tool_call_id: `controller_recovery_${Date.now()}_${idx + 1}`,
            role: 'tool',
            name: toolName,
            content: responseFormatter.format(result.type, result),
            data: result.data,
            type: result.type,
            success: result.success,
        };
    }));

    const primary = executed[0];
    return {
        message: primary?.content || 'Mình đã xử lý yêu cầu và hiển thị kết quả bên dưới.',
        toolResults: executed,
    };
}

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

        let safeMessage = sanitizeAssistantText(result.message);
        let safeToolResults = result.toolResults || [];

        if (safeToolResults.length === 0 && /<tool_call\b/i.test(result.message || '')) {
            try {
                const recovered = await recoverToolResultsFromRawMessage(result.message, req.user, location);
                if (recovered) {
                    safeMessage = recovered.message;
                    safeToolResults = recovered.toolResults;
                }
            } catch (recoveryError) {
                console.error('[Chatbot Controller] Tool-call recovery failed:', recoveryError.message);
            }
        }

        res.json({
            success: true,
            data: {
                message: safeMessage,
                contextMessage: sanitizeAssistantText(result.contextMessage || safeMessage),
                toolResults: safeToolResults,
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
