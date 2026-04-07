const { generatePlatformReport } = require('../../reportService');

/**
 * Action: export_platform_report
 * Description: Generates a global platform report in Excel format. 
 * High-level summary of total users, venues, and bookings.
 * Restricted to administrators only.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'export_platform_report',
            description: 'Xuất báo cáo tổng quan toàn nền tảng. Chỉ dành cho Admin.',
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
    roles: ['ADMIN'],
    execute: async ({ args, userRole }) => {
        if (userRole !== 'ADMIN') return { success: false, message: 'Chỉ Admin mới có quyền này!' };
        const result = await generatePlatformReport(args.startDate, args.endDate);
        return {
            success: true,
            type: 'file_download',
            message: 'Đã tạo báo cáo nền tảng!',
            data: { filename: result.filename, downloadUrl: `/api/chatbot/export/${result.filename}` },
        };
    }
};
