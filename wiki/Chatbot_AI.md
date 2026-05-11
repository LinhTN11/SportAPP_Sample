# AI Chatbot

SportApp integrates an intelligent assistant to help users navigate the platform, find information, and book venues efficiently.

## Architecture

### Backend Logic
Located in `backend/src/services/chatbot/`:
- **Knowledge Base:** The bot uses predefined rules and data stored in `docs/knowledge_base.json` to answer FAQs.
- **Action Handlers:** Dedicated scripts like `search_faq.action.js` determine the intent of the user and fetch relevant data.
- **Fallback Tools:** If the bot cannot answer using simple rules, it triggers specific backend tools to query the database (e.g., suggesting an available venue based on user criteria).

### Frontend Presentation
Located primarily in `frontend/src/components/chat/`:
- **BotToolResults.js**: This component dynamically renders the output of the chatbot's internal tools. If the bot suggests a venue, this component will render an interactive card allowing the user to view details or book directly from the chat interface.

## Use Cases
1. **FAQ Answering:** Quick responses regarding booking policies, pricing, or account management.
2. **Venue Discovery:** Users can ask the bot to find available fields (e.g., "Find me a football field available tomorrow at 6 PM"). The bot queries the database and presents actionable UI cards.
