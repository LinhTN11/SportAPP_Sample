const assert = require('node:assert/strict');
const {
    sanitizeAssistantText,
    extractToolCallsFromText,
    normalizeToolArgs,
} = require('../src/services/chatbot/utils/toolCallFallback');

function run() {
    const sanitized = sanitizeAssistantText('Hello [UI_INTERACTION:CLARIFICATION] <tool_call>{"name":"search_venues"}</tool_call> world');
    assert.equal(sanitized, 'Hello world');

    const calls = extractToolCallsFromText('<tool_call>{"name":"search_venues","arguments":{"location":"Hà Nội","query":"my dinh"}}</tool_call>');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'search_venues');
    assert.equal(calls[0].arguments.location, 'Hà Nội');

    const normalizedSearch = normalizeToolArgs('search_venues', { location: 'Hà Nội', query: 'my dinh' });
    assert.deepEqual(normalizedSearch, { city: 'Hà Nội', name: 'my dinh' });

    const normalizedBooking = normalizeToolArgs('create_booking', { venueId: 'abc', name: 'Sân Mỹ Đình' });
    assert.deepEqual(normalizedBooking, { venueId: 'abc', name: 'Sân Mỹ Đình', fieldId: 'abc' });

    console.log('chatbot-tool-fallback smoke test passed');
}

run();
