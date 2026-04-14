function sanitizeAssistantText(content) {
    if (!content || typeof content !== 'string') return content;
    return content
        .replace(/<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi, '')
        .replace(/\[UI_INTERACTION:[^\]]*\]/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function extractToolCallsFromText(content) {
    if (!content || typeof content !== 'string') return [];

    const calls = [];
    const blocks = content.match(/<tool_call\b[^>]*>\s*([\s\S]*?)\s*<\/tool_call>/gi) || [];

    for (const block of blocks) {
        const jsonStr = block.replace(/<\/?tool_call\b[^>]*>/gi, '').trim();
        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed?.name) {
                calls.push({
                    name: parsed.name,
                    arguments: parsed.arguments || {},
                });
            }
            continue;
        } catch (_) {}

        try {
            const repaired = jsonStr
                .replace(/([\{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/'/g, '"');
            const parsed = JSON.parse(repaired);
            if (parsed?.name) {
                calls.push({
                    name: parsed.name,
                    arguments: parsed.arguments || {},
                });
            }
        } catch (_) {}
    }

    return calls;
}

function normalizeToolArgs(toolName, args = {}) {
    const normalized = { ...args };

    if (toolName === 'search_venues') {
        if (!normalized.city && normalized.location) normalized.city = normalized.location;
        if (!normalized.name && normalized.query) normalized.name = normalized.query;
        delete normalized.location;
        delete normalized.query;
    }

    if (toolName === 'create_booking') {
        if (!normalized.fieldId && normalized.venueId) normalized.fieldId = normalized.venueId;
        if (!normalized.fieldId && normalized.name) normalized.fieldId = normalized.name;
    }

    return normalized;
}

module.exports = {
    sanitizeAssistantText,
    extractToolCallsFromText,
    normalizeToolArgs,
};
