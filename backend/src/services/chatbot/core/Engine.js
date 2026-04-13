const axios = require('axios');
const prisma = require('../utils/prisma');
const registry = require('./Registry');
const promptManager = require('./PromptManager');
const responseFormatter = require('../formatters/ResponseFormatter');
const { reverseGeocode } = require('../utils/helpers');

const { resolveId } = require('../utils/resolver');
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'qwen2.5-7b-instruct-1m';

/**
 * ChatbotEngine
 * Responsibility: The core engine that manages the dialogue loop, 
 * LM Studio communication, and tool execution orchestration.
 */
class ChatbotEngine {
    /**
     * Entry point: Sends a message to the AI and handles function calling.
     * @param {string} userMessage 
     * @param {object} user - { id, role, fullName }
     * @param {array} history - conversation history
     * @param {object} coords - { lat, lng }
     * @param {string|number} venueId - optional venue context
     */
    async sendMessage(userMessage, user, history = [], coords = null, venueId = null) {
        try {
            // 1. Apply History Limit (Expanded for "difficult guests" as requested)
            const HISTORY_LIMIT = 20; 
            const trimmedHistory = history.slice(-HISTORY_LIMIT);

            // 2. Resolve location (Optimized: Skip if no coords)
            let locationLabel = null;
            if (coords) locationLabel = await reverseGeocode(coords.lat, coords.lng);

            // 3. Build system prompt
            const systemPrompt = promptManager.buildSystemPrompt(user.role, user.fullName, coords, locationLabel);
            
            // 4. Resolve IDs & Instant Bypass
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}/gi; // Optimized regex
            const matches = userMessage.match(uuidRegex);
            const hasID = !!matches;

            if (hasID && userMessage.startsWith('BOOK_VENUE:')) {
                const targetID = matches[0];
                const resolution = await resolveId(targetID, prisma);
                console.log(`[AI Engine] Instant Bypass triggered for ${targetID} (${resolution.type})`);

                if (resolution.type === 'field' || resolution.type === 'venue') {
                    let field = null;
                    let allFields = [];
                    let venue = null;

                    if (resolution.type === 'field') {
                        field = resolution.data;
                        venue = field.venue;
                        allFields = [field];
                    } else {
                        venue = resolution.data;
                        allFields = venue.fields || [];
                        field = allFields[0];
                    }

                    if (field) {
                        const bypassResult = {
                            success: true,
                            type: 'booking_form',
                            data: {
                                fieldId: field.id,
                                fieldName: field.name,
                                venueId: venue.id,
                                venueName: venue.name,
                                openTime: venue.openTime,
                                closeTime: venue.closeTime,
                                pricingRules: field.pricingRules,
                                availableFields: allFields.map(f => ({ id: f.id, name: f.name, pricingRules: f.pricingRules })),
                                missingFields: ['date', 'startTime', 'time', 'payment'],
                                currentArgs: { fieldId: field.id }
                            }
                        };
                        const displayMessage = responseFormatter.format(bypassResult.type, bypassResult);
                        return {
                            role: 'assistant',
                            message: displayMessage,
                            toolResults: [
                                {
                                    tool_call_id: 'instant_bypass_' + Date.now(),
                                    role: 'tool',
                                    name: 'create_booking',
                                    content: displayMessage,
                                    data: bypassResult.data,
                                    type: bypassResult.type,
                                    success: true
                                }
                            ]
                        };
                    }
                }
            }

            // 5. Prepare messages for LLM
            const messages = [
                { role: 'system', content: systemPrompt },
                ...trimmedHistory,
                { role: 'user', content: userMessage }
            ];

            if (hasID) {
                const targetID = matches[0];
                messages.push({ 
                    role: 'system', 
                    content: `THÔNG TIN: Người dùng đề cập đến ID [${targetID}]. 
                    - Nếu muốn ĐẶT SÂN, bạn PHẢI gọi create_booking.
                    - TUYỆT ĐỐI KHÔNG tự ý điền ngày/giờ/thanh toán nếu người dùng chưa nói. Hãy gọi hàm với duy nhất tham số fieldId để hiện Form.` 
                });
            }

            // 6. Tool Setup
            let tools = registry.getToolDefinitions(user.role);
            let tool_choice = 'auto';

            if (hasID) {
                const targetID = matches[0];
                const resolution = await resolveId(targetID, prisma);
                
                if (resolution.type === 'field') {
                    tools = tools.filter(t => t.function.name === 'create_booking');
                } else {
                    tools = tools.filter(t => ['get_venue_detail', 'create_booking', 'get_available_time_slots'].includes(t.function.name));
                }
                tool_choice = 'required';
            }

            // 7. API Call to LLM
            console.log(`[AI Engine] Sending turn to LLM (${LM_STUDIO_MODEL})...`);
            
            const response = await axios.post(`${LM_STUDIO_URL}/v1/chat/completions`, {
                model: LM_STUDIO_MODEL,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice,
                temperature: 0.1 
            });

            const choice = response.data.choices[0];
            const message = choice.message;

            // 8. Parallel Tool Call Handling (OPTIMIZATION 1)
            if (message.tool_calls && message.tool_calls.length > 0) {
                console.log(`[AI Engine] Parallel execution of ${message.tool_calls.length} tool(s)...`);

                const toolPromises = message.tool_calls.map(async (tool) => {
                    const { name, arguments: argStr } = tool.function;
                    let args = {};
                    try {
                        args = typeof argStr === 'string' ? JSON.parse(argStr) : argStr;
                    } catch (e) {
                        console.error('[AI Engine] Failed to parse tool arguments:', argStr);
                    }
                    
                    // context injection
                    if (venueId && !args.venueId && ['get_venue_detail', 'get_available_time_slots', 'get_owner_booking_summary'].includes(name)) {
                        args.venueId = venueId;
                    }

                    try {
                        const result = await registry.executeAction(name, {
                            args,
                            userId: user.id,
                            userRole: user.role,
                            userLocation: coords,
                            prisma
                        });

                        const summary = responseFormatter.format(result.type, result);
                        return {
                            tool_call_id: tool.id,
                            role: 'tool',
                            name,
                            content: summary,
                            data: result.data,
                            type: result.type,
                            success: result.success,
                            rawMessage: {
                                role: 'tool',
                                tool_call_id: tool.id,
                                name: name,
                                content: summary
                            }
                        };
                    } catch (err) {
                        const errorMsg = `Lỗi: ${err.message}`;
                        return {
                            tool_call_id: tool.id,
                            role: 'tool',
                            name,
                            content: errorMsg,
                            success: false,
                            rawMessage: {
                                role: 'tool',
                                tool_call_id: tool.id,
                                name: name,
                                content: errorMsg
                            }
                        };
                    }
                });

                const toolResults = await Promise.all(toolPromises);
                
                const toolOutputs = toolResults.map(({ rawMessage, ...rest }) => rest);
                const toolMessages = toolResults.map(r => r.rawMessage);

                // 9. Second Pass Logic: Prevent narration for UI actions
                const UI_DRIVING_TYPES = ['clarification', 'booking_form', 'available_slots', 'venue_detail', 'booking_created', 'options'];
                const shouldShortCircuit = toolOutputs.some(o => UI_DRIVING_TYPES.includes(o.type));

                if (shouldShortCircuit) {
                    console.log('[AI Engine] UI-intensive result detected. Skipping narration pass.');
                    const primaryResult = toolOutputs.find(o => UI_DRIVING_TYPES.includes(o.type));
                    let displayMessage = primaryResult.content;
                    displayMessage = displayMessage.replace('[UI_INTERACTION:CLARIFICATION]', '').replace(/\[UI_INTERACTION:.*?\]/g, '').trim();

                    return {
                        role: 'assistant',
                        message: displayMessage,
                        toolResults: toolOutputs
                    };
                }

                console.log(`[AI Engine] Sending tool results back to LLM for final response...`);
                const secondResponse = await axios.post(`${LM_STUDIO_URL}/v1/chat/completions`, {
                    model: LM_STUDIO_MODEL,
                    messages: [
                        ...messages,
                        message, 
                        ...toolMessages
                    ],
                    temperature: 0.1
                });

                const finalMessage = secondResponse.data.choices[0].message;
                return {
                    role: 'assistant',
                    message: finalMessage.content,
                    toolResults: toolOutputs
                };
            }

            // 10. Direct response
            return {
                role: 'assistant',
                message: message.content
            };

        } catch (err) {
            console.error('[AI Engine] Error occurred:', err.message);
            throw err;
        }
    }
}

module.exports = new ChatbotEngine();
