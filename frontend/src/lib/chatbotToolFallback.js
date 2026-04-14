const RAW_TOOL_CALL_REGEX = /<tool_call\b[^>]*>\s*([\s\S]*?)\s*<\/tool_call>/i;

export function sanitizeRawToolCallText(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi, '')
        .replace(/\[UI_INTERACTION:[^\]]*\]/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function parseRawToolCall(text) {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(RAW_TOOL_CALL_REGEX);
    if (!match || !match[1]) return null;

    const raw = match[1].trim();
    try {
        return JSON.parse(raw);
    } catch (_) {
        try {
            const repaired = raw
                .replace(/([\{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .replace(/'/g, '"');
            return JSON.parse(repaired);
        } catch (_) {
            return null;
        }
    }
}

export function buildBypassCommand(toolCall) {
    if (!toolCall?.name) return null;
    const args = toolCall.arguments || {};
    const normalized = { ...args };

    if (toolCall.name === 'search_venues') {
        if (!normalized.city && normalized.location) normalized.city = normalized.location;
        delete normalized.location;
        delete normalized.query;
    }

    const argText = Object.entries(normalized)
        .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== '')
        .map(([key, value]) => `${key}="${String(value).replace(/"/g, '')}"`)
        .join(' ');

    return `${toolCall.name}${argText ? ` ${argText}` : ''}`;
}
