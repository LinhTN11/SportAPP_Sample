const { lunarToSolar } = require('../utils/helpers');

/**
 * Action: get_solar_date
 * Description: Converts a Vietnamese Lunar date (Âm lịch) to a Gregoria Solar date (Dương lịch).
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'get_solar_date',
            description: 'Chuyển đổi Ngày Âm Lịch Việt Nam sang Ngày Dương Lịch. Sử dụng khi người dùng nhắc đến "âm lịch" hoặc các ngày lễ âm (như 10/3 âm).',
            parameters: {
                type: 'object',
                properties: {
                    lunarDay: { type: 'number', description: 'Ngày âm lịch (1-30)' },
                    lunarMonth: { type: 'number', description: 'Tháng âm lịch (1-12)' },
                    lunarYear: { type: 'number', description: 'Năm âm lịch (ví dụ: 2026). Nếu không có, mặc định dùng năm hiện tại.' },
                    isLeap: { type: 'boolean', description: 'Có phải tháng nhuận hay không (mặc định false)' }
                },
                required: ['lunarDay', 'lunarMonth'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args }) => {
        const { lunarDay, lunarMonth, lunarYear, isLeap } = args;
        const currentYear = new Date().getFullYear();
        const year = lunarYear || currentYear;

        try {
            const solarDate = lunarToSolar(lunarDay, lunarMonth, year, isLeap || false);
            return {
                success: true,
                type: 'date_conversion',
                data: {
                    lunar: `${lunarDay}/${lunarMonth}/${year}${isLeap ? ' (nhuận)' : ''} Âm lịch`,
                    solar: solarDate,
                    message: `Ngày ${lunarDay}/${lunarMonth} Âm lịch năm ${year} tương ứng với ngày ${solarDate} Dương lịch.`
                }
            };
        } catch (error) {
            return { success: false, message: 'Không thể chuyển đổi ngày âm lịch này. Vui lòng kiểm tra lại.' };
        }
    }
};
