const { generateBookingReport } = require('../../reportService');

/**
 * Action: export_booking_report
 * Description: Generates a detailed booking list for a specified date range.
 * Useful for owners and administrators to track performance.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'export_booking_report',
            description: 'Xuất báo cáo chi tiết booking ra file Excel.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                },
                required: ['startDate', 'endDate'],
            },
        },
    },
    roles: ['OWNER', 'ADMIN'],
    execute: async ({ args }) => {
        const result = await generateBookingReport(args.startDate, args.endDate);
        return {
            success: true,
            type: 'file_download',
            message: 'Đã tạo báo cáo booking!',
            data: { filename: result.filename, downloadUrl: `/api/chatbot/export/${result.filename}` },
        };
    }
};
