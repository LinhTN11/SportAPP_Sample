const { getWeatherByCoords, getWeatherForCity } = require('../../weatherService');
const { reverseGeocode } = require('../utils/helpers');

/**
 * Action: get_weather
 * Description: Gets current weather and short forecast for the user's location or a named city.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Lấy thời tiết hiện tại và dự báo ngắn theo vị trí GPS hoặc theo tên thành phố người dùng đang ở.',
            parameters: {
                type: 'object',
                properties: {
                    lat: { type: 'number', description: 'Vĩ độ GPS' },
                    lon: { type: 'number', description: 'Kinh độ GPS' },
                    locationLabel: { type: 'string', description: 'Tên vị trí hiển thị (ví dụ: Quận 1, Hồ Chí Minh)' },
                    city: { type: 'string', description: 'Tên thành phố nếu không có GPS' },
                },
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args }) => {
        const { lat, lon, locationLabel, city } = args || {};

        if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
            const resolvedLabel = locationLabel || await reverseGeocode(Number(lat), Number(lon));
            const weather = await getWeatherByCoords(Number(lat), Number(lon), resolvedLabel || 'Vị trí hiện tại');
            if (!weather) return { success: false, message: 'Không thể lấy dữ liệu thời tiết theo GPS.' };
            return { success: true, type: 'weather', data: weather };
        }

        const weather = await getWeatherForCity(city || null);
        if (!weather) return { success: false, message: 'Không thể lấy dữ liệu thời tiết.' };
        return { success: true, type: 'weather', data: weather };
    },
};