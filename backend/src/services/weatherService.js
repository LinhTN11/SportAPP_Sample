const axios = require('axios');

// Open-Meteo WMO Weather codes mapping to Vietnamese
const WEATHER_CODES = {
    0: { desc: 'Trời quang', icon: '☀️' },
    1: { desc: 'Chủ yếu quang', icon: '🌤️' },
    2: { desc: 'Có mây', icon: '⛅' },
    3: { desc: 'U ám', icon: '☁️' },
    45: { desc: 'Sương mù', icon: '🌫️' },
    48: { desc: 'Sương mù đóng băng', icon: '🌫️' },
    51: { desc: 'Mưa phùn nhẹ', icon: '🌦️' },
    53: { desc: 'Mưa phùn vừa', icon: '🌦️' },
    55: { desc: 'Mưa phùn dày', icon: '🌧️' },
    61: { desc: 'Mưa nhẹ', icon: '🌧️' },
    63: { desc: 'Mưa vừa', icon: '🌧️' },
    65: { desc: 'Mưa to', icon: '🌧️' },
    71: { desc: 'Tuyết nhẹ', icon: '🌨️' },
    73: { desc: 'Tuyết vừa', icon: '🌨️' },
    75: { desc: 'Tuyết dày', icon: '❄️' },
    80: { desc: 'Mưa rào nhẹ', icon: '🌦️' },
    81: { desc: 'Mưa rào vừa', icon: '🌧️' },
    82: { desc: 'Mưa rào to', icon: '⛈️' },
    95: { desc: 'Giông bão', icon: '⛈️' },
    96: { desc: 'Giông kèm mưa đá nhẹ', icon: '⛈️' },
    99: { desc: 'Giông kèm mưa đá nặng', icon: '⛈️' },
};

// Major Vietnam cities coordinates
const CITY_COORDS = {
    'hồ chí minh': { lat: 10.8231, lon: 106.6297 },
    'ho chi minh': { lat: 10.8231, lon: 106.6297 },
    'hcm': { lat: 10.8231, lon: 106.6297 },
    'sài gòn': { lat: 10.8231, lon: 106.6297 },
    'hà nội': { lat: 21.0285, lon: 105.8542 },
    'ha noi': { lat: 21.0285, lon: 105.8542 },
    'đà nẵng': { lat: 16.0544, lon: 108.2022 },
    'da nang': { lat: 16.0544, lon: 108.2022 },
    'cần thơ': { lat: 10.0452, lon: 105.7469 },
    'can tho': { lat: 10.0452, lon: 105.7469 },
    'hải phòng': { lat: 20.8449, lon: 106.6881 },
    'nha trang': { lat: 12.2388, lon: 109.1967 },
    'huế': { lat: 16.4637, lon: 107.5909 },
    'hue': { lat: 16.4637, lon: 107.5909 },
    'vũng tàu': { lat: 10.346, lon: 107.0843 },
    'biên hòa': { lat: 10.9574, lon: 106.8426 },
    'thủ đức': { lat: 10.8558, lon: 106.7539 },
};

function getCityCoords(city) {
    if (!city) {
        return {
            lat: parseFloat(process.env.DEFAULT_WEATHER_LAT) || 10.8231,
            lon: parseFloat(process.env.DEFAULT_WEATHER_LON) || 106.6297,
        };
    }
    const key = city.toLowerCase().trim();
    return CITY_COORDS[key] || {
        lat: parseFloat(process.env.DEFAULT_WEATHER_LAT) || 10.8231,
        lon: parseFloat(process.env.DEFAULT_WEATHER_LON) || 106.6297,
    };
}

/**
 * Get current weather + 3-day forecast for a city
 */
async function getWeatherForCity(city) {
    try {
        const { lat, lon } = getCityCoords(city);
        return await getWeatherByCoords(lat, lon, city || 'Hồ Chí Minh');
    } catch (error) {
        console.error('Weather API error:', error.message);
        return null;
    }
}

async function getWeatherByCoords(lat, lon, locationLabel = 'Vị trí hiện tại') {
    try {
        const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'Asia/Ho_Chi_Minh',
                forecast_days: 3,
            },
            timeout: 5000,
        });

        const { current, daily } = res.data;
        const weatherInfo = WEATHER_CODES[current.weather_code] || { desc: 'Không rõ', icon: '❓' };

        const forecast = daily.time.map((date, i) => {
            const code = daily.weather_code[i];
            const info = WEATHER_CODES[code] || { desc: 'Không rõ', icon: '❓' };
            return {
                date,
                maxTemp: daily.temperature_2m_max[i],
                minTemp: daily.temperature_2m_min[i],
                rainChance: daily.precipitation_probability_max[i],
                description: info.desc,
                icon: info.icon,
            };
        });

        const warnings = getWeatherWarnings(current, forecast);

        return {
            current: {
                temperature: current.temperature_2m,
                humidity: current.relative_humidity_2m,
                windSpeed: current.wind_speed_10m,
                description: weatherInfo.desc,
                icon: weatherInfo.icon,
            },
            forecast,
            warnings,
            locationLabel,
        };
    } catch (error) {
        console.error('Weather API error:', error.message);
        return null;
    }
}

/**
 * Generate weather warnings
 */
function getWeatherWarnings(current, forecast) {
    const warnings = [];

    if (current.temperature_2m >= 38) {
        warnings.push({ type: 'heat', message: `⚠️ Cảnh báo nắng nóng! Nhiệt độ ${current.temperature_2m}°C. Nên tránh vận động ngoài trời.` });
    }
    if (current.wind_speed_10m >= 40) {
        warnings.push({ type: 'wind', message: `⚠️ Gió mạnh ${current.wind_speed_10m} km/h. Cẩn thận khi chơi thể thao ngoài trời.` });
    }

    for (const day of forecast) {
        if (day.rainChance >= 70) {
            warnings.push({ type: 'rain', message: `🌧️ Ngày ${day.date}: Xác suất mưa ${day.rainChance}%. Cân nhắc đặt sân trong nhà.` });
        }
        if (day.maxTemp >= 38) {
            warnings.push({ type: 'heat', message: `🌡️ Ngày ${day.date}: Dự báo nắng nóng ${day.maxTemp}°C.` });
        }
    }

    return warnings;
}

module.exports = { getWeatherForCity, getWeatherByCoords };
