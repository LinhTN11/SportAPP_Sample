const engine = require('./chatbot/core/Engine');

/**
 * chatbotService (Bridged Entry Point)
 * Responsibility: Serves as the primary entry point for the SportApp chatbot.
 * All core logic has been refactored into the /chatbot/ modular architecture.
 */
async function sendMessage(userMessage, user, history = [], coords = null, venueId = null) {
    console.log(`[Chatbot Service] Bridging to Modular Engine (Venue: ${venueId})...`);
    // Pass the message to the new modular engine for processing
    return await engine.sendMessage(userMessage, user, history, coords, venueId);
}

module.exports = {
    sendMessage
};
