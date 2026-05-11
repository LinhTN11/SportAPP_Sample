# Realtime Features

SportApp leverages WebSockets heavily to provide instant interactions across chat, notifications, and matchmaking.

## Technology
- **Socket.io**: Used for establishing bidirectional communication between the Next.js frontend and Express backend.
- **Redis Adapter**: The backend utilizes `@socket.io/redis-adapter` to ensure WebSocket events are correctly routed even if the backend is scaled horizontally across multiple Node.js instances.

## Sync Mechanisms

### Chat System
The platform features two main chat interfaces:
1. **Global Chat Bubble:** A floating widget accessible across the site.
2. **Dedicated Chat Page:** (`/chat`) A full-screen chat application.

**Key Behaviours (based on Test Checklist):**
- **Realtime Sync:** Messages sent from one interface appear instantly on the other without duplicates.
- **Read State:** Unread badges update globally. Opening a room marks messages as read and clears notifications.
- **Multi-tab Stability:** The user's online presence remains active as long as at least one tab is open.

### Matchmaking Integration
When a user accepts a matchmaking request:
1. A new, dedicated `MATCH_GROUP` chat room is automatically created by the backend.
2. The system sends an initial "Match Init Card" containing details like sport type, date, time, and location.
3. Users are instantly redirected to this new room.
4. **Venue Suggestion:** Within the match room, users can suggest venues. The UI renders an interactive card. When accepted, a `VENUE_ACCEPT` system message is generated and synced to all participants.
