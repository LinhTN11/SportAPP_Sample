const Fuse = require('fuse.js');

function normalizeText(input) {
    if (!input) return '';
    return String(input)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeSearchText(input) {
    const normalized = normalizeText(input).replace(/y/g, 'i');
    return normalized
        .split(' ')
        .filter(Boolean)
        .filter((word) => !['dat', 'book', 'san', 'cho', 'toi', 'giup', 'vui', 'long', 'nay', 'oi'].includes(word))
        .join(' ')
        .trim();
}

function rankByContainment(query, items, key = 'name') {
    const normalizedQuery = normalizeSearchText(query);
    const exact = [];
    const contains = [];

    for (const item of items) {
        const value = normalizeSearchText(item?.[key]);
        if (!value) continue;
        if (value === normalizedQuery) exact.push(item);
        else if (value.includes(normalizedQuery)) contains.push(item);
    }

    return [...exact, ...contains];
}

function fuzzySearch(query, items, options = {}) {
    const {
        keys = ['name'],
        threshold = 0.4,
        distance = 120,
        limit = 10,
        includeScore = true,
        shouldSort = true,
    } = options;

    if (!query || !Array.isArray(items) || items.length === 0) return [];

    const normalizedItems = items.map(item => ({
        ...item,
        __norm: Object.fromEntries(
            keys.map(k => [k, normalizeSearchText(item?.[k])])
        )
    }));

    const normalizedQuery = normalizeSearchText(query);

    const fuse = new Fuse(normalizedItems, {
        includeScore,
        threshold,
        distance,
        shouldSort,
        keys: keys.map(k => `__norm.${k}`),
        ignoreLocation: true,
        minMatchCharLength: 2,
    });

    const rawResults = fuse.search(normalizedQuery, { limit });
    return rawResults.map(r => ({ ...r.item, __score: r.score ?? 1 }));
}

module.exports = {
    normalizeText,
    normalizeSearchText,
    rankByContainment,
    fuzzySearch,
};
