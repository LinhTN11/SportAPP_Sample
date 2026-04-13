const fs = require('fs');
const path = require('path');

/**
 * Action: search_faq
 * Description: RAG implementation to search the internal knowledge base for platform-related questions.
 */
module.exports = {
    definition: {
        type: 'function',
        function: {
            name: 'search_faq',
            description: 'Tìm kiếm thông tin trong cơ sở kiến thức về chính sách, quy định và hướng dẫn của SportApp.',
            parameters: {
                type: 'object',
                properties: {
                    query: { 
                        type: 'string', 
                        description: 'Từ khóa hoặc câu hỏi cần tra cứu (ví dụ: "chính sách hủy sân", "đặt cọc")' 
                    },
                },
                required: ['query'],
            },
        },
    },
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],
    execute: async ({ args }) => {
        try {
            const kbPath = path.join(__dirname, '../docs/knowledge_base.json');
            const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
            
            const query = args.query.toLowerCase();
            
            // Simple keyword matching for RAG
            const results = kb.faqs.filter(f => 
                f.question.toLowerCase().includes(query) || 
                f.answer.toLowerCase().includes(query) ||
                f.category.toLowerCase().includes(query)
            );

            // Add platform rules if they match
            const matchingRules = kb.platform_rules.filter(r => r.toLowerCase().includes(query));

            if (results.length === 0 && matchingRules.length === 0) {
                return {
                    success: true,
                    type: 'knowledge',
                    data: {
                        message: "Không tìm thấy thông tin cụ thể trong cơ sở kiến thức. Tuy nhiên, bạn có thể liên hệ tổng đài 1900-SportApp để được hỗ trợ trực tiếp.",
                        found: false
                    }
                };
            }

            return {
                success: true,
                type: 'knowledge',
                data: {
                    results: results.slice(0, 3), // Limit to top 3 results
                    rules: matchingRules,
                    found: true
                }
            };
        } catch (error) {
            console.error('[Action: search_faq] Error:', error);
            return {
                success: false,
                message: "Lỗi khi truy cập cơ sở kiến thức."
            };
        }
    }
};
