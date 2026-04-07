/**
 * Action: ask_clarification
 * Description: Helper action used by the AI to ask follow-up questions with quick-reply options.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'ask_clarification',
            description: 'Hỏi người dùng câu hỏi kèm các lựa chọn để thu hẹp phạm vi tìm kiếm.',
            parameters: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'Câu hỏi cần hỏi người dùng' },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Danh sách 2-4 lựa chọn gợi ý cho người dùng bấm',
                    },
                },
                required: ['question', 'options'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args }) => {
        return {
            success: true,
            type: 'clarification',
            data: {
                question: args.question,
                options: args.options,
            },
        };
    }
};
