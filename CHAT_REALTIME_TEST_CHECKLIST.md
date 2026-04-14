# Chat Realtime Test Checklist

## Scope
Validate synchronized behavior between:
- `GlobalChatBubble` (floating widget)
- `/chat` page
- Matchmaking accept flow and match-room initialization

Use 2 accounts in 2 browsers/devices:
- Account A: post owner
- Account B: requester

## Environment Prep
1. Start backend and frontend.
2. Login A and B.
3. Open both chat surfaces:
- Bubble visible on normal pages.
- `/chat` opened in another tab.
4. Make sure both users can see each other online.

## Case 1: Accept Match -> Enter Correct Room
1. B sends request to A on a matchmaking post.
2. A accepts request.
3. Verify A is redirected to `/chat?room=<chatRoomId>`.
4. Verify a new `MATCH_GROUP` room appears (not merged into existing direct room).
5. Verify first system message contains match init card (sport/date/time/location).

Expected:
- New dedicated match room is created every accept.
- Redirect opens the exact room returned by API.

## Case 2: Realtime Messaging Sync (Bubble <-> Chat Page)
1. On A, open bubble room with B.
2. On B, open `/chat` room with A.
3. Send text from A.
4. Send image from B.

Expected:
- Both UIs receive `new_message` instantly.
- No duplicate message entries.
- Last message preview updates correctly in room list.

## Case 3: Read State Sync
1. Send several messages from B while A keeps room closed.
2. Open A bubble room.
3. Open A `/chat` room.

Expected:
- Notification badge increases when room is closed.
- Entering room marks messages as read and clears unread badge for that room.

## Case 4: Match Init Card Actions
1. In match room, click `Xem chi tiết` on match init card.
2. Click `Tham gia` on match init card.

Expected:
- `Xem chi tiết` navigates to `/matchmaking?post=<postId>`.
- `Tham gia` sends request with correct post id and shows success/error correctly.

## Case 5: Venue Suggest + Accept in Match Room
1. In match room, suggest a venue (A).
2. On B, click `Dong y san nay`.

Expected:
- Suggestion card renders with venue info and booking button.
- Accept action creates `VENUE_ACCEPT` system message.
- Both users receive update in realtime.

## Case 6: Multi-tab Stability
1. Open 2 tabs for A (one bubble page, one `/chat`).
2. Send messages from B continuously.
3. Close one A tab, keep one open.

Expected:
- A remains online while at least one tab is connected.
- Messages still delivered after one tab closes.
- A goes offline only after all tabs close.

## Pass Criteria
- All cases pass without refresh.
- No cross-room leakage.
- No duplicate emits/handlers observed in UI.
- No socket event name mismatch errors in backend logs.
