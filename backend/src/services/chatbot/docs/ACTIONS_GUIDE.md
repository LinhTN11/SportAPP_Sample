# 🧩 Developer's Guide: Creating New AI Actions

Adding new "capabilities" to the SportApp AI Agent is now as simple as creating a single file. This guide explains the structure and requirements for a successful Action.

## 🛠️ Action File Template

Every action must reside in `src/services/chatbot/actions/` and end with `.action.js`.

```javascript
/**
 * Action: [Your Action Name]
 * Description: [What this tool does - written for developers]
 */
module.exports = {
    // 1. DEFINITION: This is what the LLM (AI) will read
    definition: {
        type: 'function',
        function: {
            name: 'your_action_name_snake_case',
            description: 'Mô tả chi tiết bằng tiếng Việt để AI biết khi nào cần gọi hàm này.',
            parameters: {
                type: 'object',
                properties: {
                    param1: { type: 'string', description: 'Mô tả tham số 1' },
                    param2: { type: 'number', description: 'Mô tả tham số 2' }
                },
                required: ['param1']
            }
        }
    },

    // 2. ROLES: Who can use this tool?
    roles: ['CUSTOMER', 'OWNER', 'ADMIN'],

    // 3. EXECUTE: The actual logic
    async execute({ args, userId, userRole, userLocation, prisma }) {
        try {
            // Your logic here (Database calls, API requests, etc.)
            const result = await prisma.myTable.findMany({ ... });

            // RETURN: Must be a standard object
            return {
                success: true,
                type: 'your_custom_type', 
                data: result
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};
```

---

## 🚦 Implementation Checklist

1.  **Snake Case Name**: The `function.name` must be in `snake_case` (e.g., `check_loyalty_points`).
2.  **Explicit Descriptions**: The `description` inside `definition` is critical. If it's vague, the AI will hallucinate or fail to call the tool.
3.  **Role Safety**: Always include the correct roles. For example, don't give `CUSTOMER` access to `export_revenue_report`.
4.  **Error Handling**: Always wrap your logic in `try-catch` and return `{ success: false, message: ... }`. The AI needs to see the failure reason to relay it to the user.

---

## 🔄 The Lifecycle of an Action

1.  **Discovery**: `Registry.js` scans the folder at startup.
2.  **Inference**: When a user says something related to your action, LM Studio identifies the tool and generates the JSON payload.
3.  **Routing**: `Engine.js` receives the tool call and asks `Registry.js` for the execution logic.
4.  **Execution**: Your `execute` function runs and returns raw data.
5.  **Formatting**: `ResponseFormatter.js` converts your raw data into a human-readable summary.
6.  **Dialogue**: The final summary is sent back to the chat as the "Tool Result".

---

> [!TIP]
> **Don't Forget the Formatter!**
> After creating an action, go to `src/services/chatbot/formatters/ResponseFormatter.js` and add a case for your new `type`. This ensures the AI (and the user) gets a clean text summary of what happened.
