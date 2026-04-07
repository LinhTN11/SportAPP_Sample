const { generateRevenueReport } = require('../../reportService');

/**
 * Action: export_revenue_report
 * Description: Generates a revenue report in Excel format for a specified date range.
 * Only accessible to owners and administrators.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'export_revenue_report',
            description: 'Xuất báo cáo doanh thu ra file Excel. Chỉ dành cho Owner và Admin.',
            parameters: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', description: 'Ngày bắt đầu (YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'Ngày kết thúc (YYYY-MM-DD)' },
                },
                required: ['startDate', 'endDate'],
            },
        },
    },
    roles: ['OWNER', 'ADMIN'],
    execute: async ({ args, userRole }) => {
        if (!['OWNER', 'ADMIN'].includes(userRole)) {
            return { success: false, message: 'Bạn không có quyền xuất báo cáo!' };
        }
        const result = await generateRevenueReport(args.startDate, args.endDate);
        return {
            success: true,
            type: 'file_download',
            message: 'Đã tạo báo cáo doanh thu!',
            data: { filename: result.filename, downloadUrl: `/api/chatbot/export/${result.filename}` },
        };
    }
};
