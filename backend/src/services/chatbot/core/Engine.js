const axios = require('axios');
const prisma = require('../utils/prisma');
const registry = require('./Registry');
const promptManager = require('./PromptManager');
const responseFormatter = require('../formatters/ResponseFormatter');
const { reverseGeocode } = require('../utils/helpers');
const {
    sanitizeAssistantText,
    extractToolCallsFromText,
    normalizeToolArgs,
} = require('../utils/toolCallFallback');

const { resolveId } = require('../utils/resolver');
const { normalizeText, normalizeSearchText } = require('../utils/fuzzySearch');
const AI_API_URL = process.env.AI_API_URL || 'https://openrouter.ai/api/v1';
const AI_MODEL = 'google/gemini-2.0-pro-exp-02-05:free';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Create axios instance for AI calls
const aiApi = axios.create({
    baseURL: AI_API_URL,
    headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://sportapp.vn', // Optional for OpenRouter
        'X-Title': 'SportApp', // Optional for OpenRouter
        'Content-Type': 'application/json'
    }
});

function normalizeIntentText(input) {
    if (!input) return '';
    return String(input)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractVenueNameFromBookingIntent(message) {
    if (!message || typeof message !== 'string') return null;

    const original = message.trim();
    const normalized = normalizeIntentText(original);
    const bookingPrefixRegex = /^(dat|book)\s+san\s+/i;
    if (!bookingPrefixRegex.test(normalized)) return null;

    const originalPrefixRegex = /^\s*(đặt|dat|book)\s+sân\s+/i;
    const name = original.replace(originalPrefixRegex, '').trim();
    return name.length >= 2 ? name : null;
}

function looksLikeSportsIntent(message) {
    const normalized = normalizeIntentText(message);
    return /\b(dat|book|tim|san|huy|cancel|dat san|tim san|lich trong|khung gio)\b/.test(normalized);
}

function looksLikeWeatherIntent(message) {
    const normalized = normalizeIntentText(message);
    return /\b(thoi tiet|weather|mua khong|co mua khong|troi co mua|nang|gio|du bao)\b/.test(normalized);
}

function extractCityFromWeatherIntent(message) {
    const normalized = normalizeIntentText(message);
    const keywords = ['o', 'tai', 'khu vuc', 'thanh pho', 'tinh'];
    const parts = message.split(' ');
    
    // Simple look-ahead after keywords
    for (let i = 0; i < parts.length; i++) {
        const p = normalizeIntentText(parts[i]);
        if (keywords.includes(p) && i + 1 < parts.length) {
            return parts.slice(i + 1).join(' ').trim();
        }
    }
    
    // Fallback: try to find common city names or just the last part
    const weatherWords = ['thoi tiet', 'weather', 'du bao', 'mua', 'nang'];
    let clean = message;
    weatherWords.forEach(w => {
        const regex = new RegExp(w, 'gi');
        clean = clean.replace(regex, '');
    });
    return clean.trim() || null;
}

function extractJsonObject(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

// Removed inferChatIntentWithLlm to save API calls.
// Complex intent resolution is now handled directly by the main LLM turn.

async function searchVenueByNameStrictly(name, userLocation, prisma) {
    if (!name) return null;
    const result = await registry.executeAction('search_venues', {
        args: { name },
        userId: null,
        userRole: 'CUSTOMER',
        userLocation,
        prisma,
    });

    if (!result?.success || result.type !== 'venues' || !Array.isArray(result.data) || result.data.length === 0) {
        return null;
    }

    return result;
}

async function getWeatherByUserLocation(userLocation, locationLabel, city, prisma) {
    const weatherArgs = {};
    if (userLocation?.lat && userLocation?.lng) {
        weatherArgs.lat = userLocation.lat;
        weatherArgs.lon = userLocation.lng;
        weatherArgs.locationLabel = locationLabel || 'Vị trí hiện tại';
    } else if (city) {
        weatherArgs.city = city;
    }

    const weatherResult = await registry.executeAction('get_weather', {
        args: weatherArgs,
        userId: null,
        userRole: 'CUSTOMER',
        userLocation,
        prisma,
    });

    if (!weatherResult?.success) return null;

    const summary = sanitizeAssistantText(responseFormatter.format(weatherResult.type, weatherResult));
    return {
        role: 'assistant',
        message: summary,
        toolResults: [
            {
                tool_call_id: 'weather_bypass_' + Date.now(),
                role: 'tool',
                name: 'get_weather',
                content: summary,
                data: weatherResult.data,
                type: weatherResult.type,
                success: true,
            }
        ]
    };
}

async function resolveBookingTargetStrict(input, prisma) {
    if (!input) return { type: 'unknown' };

    const normalizedInput = normalizeSearchText(input);
    if (!normalizedInput) return { type: 'unknown' };

    const venueCandidates = await prisma.venue.findMany({
        where: { status: 'APPROVED' },
        include: {
            fields: {
                where: { isActive: true },
                include: { pricingRules: { where: { isActive: true } } }
            }
        },
        take: 200,
    });

    for (const venue of venueCandidates) {
        const normalizedVenueName = normalizeSearchText(venue.name);
        if (normalizedVenueName === normalizedInput || normalizedVenueName.includes(normalizedInput)) {
            return { type: 'venue', data: venue };
        }

        for (const field of venue.fields || []) {
            const normalizedFieldName = normalizeSearchText(field.name);
            if (normalizedFieldName === normalizedInput || normalizedFieldName.includes(normalizedInput)) {
                return { type: 'field', data: field };
            }
        }
    }

    return { type: 'unknown' };
}
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
            
            // 4. Resolve IDs & Instant Command Bypass (Optimized to avoid unnecessary LLM calls)
            const availableActions = registry.getToolDefinitions(user.role).map(t => t.function.name);
            const firstWord = userMessage.split(' ')[0];

            // 4a. Natural-language direct intent bypass using regex and DB resolution (NO API CALL)
            if (looksLikeWeatherIntent(userMessage)) {
                try {
                    const inferredCity = extractCityFromWeatherIntent(userMessage);
                    console.log(`[AI Engine] Weather bypass attempt for city: ${inferredCity}`);
                    const weatherResponse = await getWeatherByUserLocation(coords, locationLabel, inferredCity, prisma);
                    if (weatherResponse) return weatherResponse;
                } catch (weatherErr) {
                    console.error('[AI Engine] Weather bypass failed:', weatherErr.message);
                }
            }

            const venueNameFromIntent = extractVenueNameFromBookingIntent(userMessage);
            if (venueNameFromIntent && !userMessage.startsWith('BOOK_VENUE:')) {
                try {
                    console.log(`[AI Engine] Booking intent bypass for venue name: ${venueNameFromIntent}`);
                    const resolvedTarget = await resolveBookingTargetStrict(venueNameFromIntent, prisma);

                    if (resolvedTarget.type === 'field' || resolvedTarget.type === 'venue') {
                        const fieldId = resolvedTarget.type === 'field'
                            ? resolvedTarget.data.id
                            : venueNameFromIntent;

                        const bookingTry = await registry.executeAction('create_booking', {
                            args: { fieldId },
                            userId: user.id,
                            userRole: user.role,
                            userLocation: coords,
                            prisma
                        });

                        if (bookingTry && bookingTry.success) {
                            const summary = sanitizeAssistantText(responseFormatter.format(bookingTry.type, bookingTry));
                            return {
                                role: 'assistant',
                                message: summary,
                                toolResults: [
                                    {
                                        tool_call_id: 'intent_bypass_' + Date.now(),
                                        role: 'tool',
                                        name: 'create_booking',
                                        content: summary,
                                        data: bookingTry.data,
                                        type: bookingTry.type,
                                        success: true
                                    }
                                ]
                            };
                        }
                    }

                    // If exact venue found but not booking, try search result directly
                    const searchTry = await searchVenueByNameStrictly(venueNameFromIntent, coords, prisma);
                    if (searchTry && searchTry.success) {
                        const searchSummary = sanitizeAssistantText(responseFormatter.format(searchTry.type, searchTry));
                        return {
                            role: 'assistant',
                            message: searchSummary,
                            toolResults: [
                                {
                                    tool_call_id: 'intent_search_' + Date.now(),
                                    role: 'tool',
                                    name: 'search_venues',
                                    content: searchSummary,
                                    data: searchTry.data,
                                    type: searchTry.type,
                                    success: searchTry.success
                                }
                            ]
                        };
                    }
                } catch (intentErr) {
                    console.error('[AI Engine] Intent bypass failed:', intentErr.message);
                }
            }
            
            if (availableActions.includes(firstWord)) {
                console.log(`[AI Engine] Instant Command Bypass triggered for: ${firstWord}`);
                const argsArr = userMessage.substring(firstWord.length).trim().split(' ');
                const args = {};
                argsArr.forEach(arg => {
                    const parts = arg.split('=');
                    if (parts.length === 2) {
                        const [key, value] = parts;
                        if (key && value) args[key] = value.replace(/^["']|["']$/g, '');
                    }
                });

                try {
                    const result = await registry.executeAction(firstWord, {
                        args,
                        userId: user.id,
                        userRole: user.role,
                        userLocation: coords,
                        prisma
                    });

                    const summary = sanitizeAssistantText(responseFormatter.format(result.type, result));
                    return {
                        role: 'assistant',
                        message: summary,
                        toolResults: [
                            {
                                tool_call_id: 'cmd_bypass_' + Date.now(),
                                role: 'tool',
                                name: firstWord,
                                content: summary,
                                data: result.data,
                                type: result.type,
                                success: result.success
                            }
                        ]
                    };
                } catch (e) {
                    console.error('[AI Engine] Direct command execution failed:', e);
                    // Fallthrough to normal LLM processing
                }
            }

            // Fallback for older bypasses
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
            const matches = userMessage.match(uuidRegex);
            const hasID = !!matches;

            // Deterministic bypass when UI sends a bare UUID after selecting a field/option chip.
            if (hasID) {
                const targetID = matches[0];
                if (userMessage.trim() === targetID) {
                    try {
                        const result = await registry.executeAction('create_booking', {
                            args: { fieldId: targetID },
                            userId: user.id,
                            userRole: user.role,
                            userLocation: coords,
                            prisma
                        });

                        const summary = sanitizeAssistantText(responseFormatter.format(result.type, result));
                        return {
                            role: 'assistant',
                            message: summary,
                            toolResults: [
                                {
                                    tool_call_id: 'uuid_bypass_' + Date.now(),
                                    role: 'tool',
                                    name: 'create_booking',
                                    content: summary,
                                    data: result.data,
                                    type: result.type,
                                    success: result.success
                                }
                            ]
                        };
                    } catch (uuidErr) {
                        console.error('[AI Engine] UUID bypass failed:', uuidErr.message);
                    }
                }
            }

            if (hasID && userMessage.startsWith('BOOK_VENUE:')) {
                const targetID = matches[0];
                const resolution = await resolveId(targetID, prisma);
                console.log(`[AI Engine] Instant Bypass triggered for ${targetID} (${resolution.type})`);
                
                if (resolution.type === 'field' || resolution.type === 'venue') {
                    const data = resolution.data;
                    const field = resolution.type === 'field' ? data : data.fields[0];
                    const venue = resolution.type === 'field' ? data.venue : data;

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
                                availableFields: (venue.fields || []).map(f => ({ id: f.id, name: f.name, pricingRules: f.pricingRules })),
                                missingFields: ['date', 'startTime', 'time', 'payment'],
                                currentArgs: { fieldId: field.id }
                            }
                        };
                        const displayMessage = sanitizeAssistantText(responseFormatter.format(bypassResult.type, bypassResult));
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
            console.log(`[AI Engine] Sending turn to LLM (${AI_MODEL})...`);
            
            const response = await aiApi.post('/chat/completions', {
                model: AI_MODEL,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice,
                temperature: 0.1 
            });

            const choice = response.data.choices[0];
            const message = choice.message;

            // 8. Parallel Tool Call Handling (supports native tool_calls and <tool_call>...</tool_call> fallback)
            const parsedFallbackCalls = extractToolCallsFromText(message.content);
            const fallbackToolCalls = parsedFallbackCalls.map((call, idx) => ({
                id: `text_tool_${Date.now()}_${idx + 1}`,
                function: {
                    name: call.name,
                    arguments: JSON.stringify(call.arguments || {}),
                },
            }));
            const effectiveToolCalls = (message.tool_calls && message.tool_calls.length > 0)
                ? message.tool_calls
                : fallbackToolCalls;

            if (effectiveToolCalls.length > 0) {
                console.log(`[AI Engine] Parallel execution of ${effectiveToolCalls.length} tool(s)...`);

                const toolPromises = effectiveToolCalls.map(async (tool) => {
                    const { name, arguments: argStr } = tool.function;
                    let args = {};
                    try {
                        args = typeof argStr === 'string' ? JSON.parse(argStr) : argStr;
                    } catch (e) {
                        console.error('[AI Engine] Failed to parse tool arguments:', argStr);
                    }
                    args = normalizeToolArgs(name, args);
                    
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

                        const summary = sanitizeAssistantText(responseFormatter.format(result.type, result));
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
                const UI_DRIVING_TYPES = [
                    'clarification', 'booking_form', 'available_slots', 'venue_detail', 
                    'booking_created', 'booking_cancelled', 'weather', 'options', 'venues',
                    'bookings', 'stats', 'owner_venues', 'top_owners', 'platform_stats'
                ];
                const shouldShortCircuit = fallbackToolCalls.length > 0 || toolOutputs.some(o => UI_DRIVING_TYPES.includes(o.type));

                if (shouldShortCircuit) {
                    console.log('[AI Engine] UI-intensive result detected. Skipping narration pass.');
                    const primaryResult = toolOutputs.find(o => UI_DRIVING_TYPES.includes(o.type));
                    let displayMessage = primaryResult?.content || 'Mình đã xử lý yêu cầu và hiển thị kết quả bên dưới.';
                    displayMessage = displayMessage.replace('[UI_INTERACTION:CLARIFICATION]', '').replace(/\[UI_INTERACTION:.*?\]/g, '').trim();
                    displayMessage = sanitizeAssistantText(displayMessage);

                    return {
                        role: 'assistant',
                        message: displayMessage,
                        toolResults: toolOutputs
                    };
                }

                console.log(`[AI Engine] Sending tool results back to LLM for final response...`);
                const secondResponse = await aiApi.post('/chat/completions', {
                    model: AI_MODEL,
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
                    message: sanitizeAssistantText(finalMessage.content),
                    toolResults: toolOutputs
                };
            }

            // 10. Direct response
            return {
                role: 'assistant',
                message: sanitizeAssistantText(message.content)
            };

        } catch (err) {
            console.error('[AI Engine] Error occurred:', err.message);
            throw err;
        }
    }
}

module.exports = new ChatbotEngine();
