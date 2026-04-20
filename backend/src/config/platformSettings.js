/**
 * Platform settings helper - reads/writes to platform-settings.json
 * Used for tax voucher generation (platform name, tax code, address)
 */
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../../data/platform-settings.json');

const DEFAULT_SETTINGS = {
    platformName: 'SPORTAPP PLATFORM',
    taxCode: '0101234567',
    address: 'Tòa nhà Bitexco, TP. Hồ Chí Minh',
    representative: '',
    updatedAt: null,
};

function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.error('Error reading platform settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings(data) {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = getSettings();
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
}

module.exports = { getSettings, saveSettings };
