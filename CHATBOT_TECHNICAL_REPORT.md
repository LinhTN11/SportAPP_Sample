# Báo cáo kỹ thuật: Chatbot SportApp (Đề cương chi tiết)

## 1. Mở đầu
- **Mục tiêu:** Hỗ trợ người dùng thao tác nhanh trong hệ thống đặt sân thông qua hội thoại, ưu tiên hành động hơn trò chuyện.
- **Đối tượng sử dụng:** 
  - **CUSTOMER:** Tìm sân, đặt sân, hỏi lịch trống, thời tiết, FAQ.
  - **OWNER:** Quản lý sân của mình, xem thống kê, báo cáo.
  - **ADMIN:** Thống kê toàn sân, xuất báo cáo, quản trị vận hành.
- **Phạm vi hỗ trợ:** Tìm kiếm sân, đặt/hủy sân, tra cứu lịch trống, thời tiết, FAQ/RAG, báo cáo và thống kê.

## 2. Kiến trúc tổng quan
Hệ thống chatbot được thiết kế theo mô hình **plugin-based modular action** gồm các lớp:
- **Bridge Service:** `backend/src/services/chatbotService.js`
- **Core Engine:** `backend/src/services/chatbot/core/Engine.js`
- **Action Registry:** `backend/src/services/chatbot/core/Registry.js`
- **Prompt Manager:** `backend/src/services/chatbot/core/PromptManager.js`
- **Response Formatter:** `backend/src/services/chatbot/formatters/ResponseFormatter.js`
- **Actions (Plugins):** `backend/src/services/chatbot/actions/*.action.js`
- **LLM Integration:** LM Studio thông qua `LM_STUDIO_URL`, `LM_STUDIO_MODEL`

Tài liệu kiến trúc tham khảo: `backend/src/services/chatbot/docs/ARCHITECTURE.md`.

## 3. Luồng xử lý backend
- **Endpoint chính:** `POST /api/chatbot/message` (auth bắt buộc)
  - Route: `backend/src/routes/chatbot.js`
  - Controller: `backend/src/controllers/chatbotController.js`
  - Service: `backend/src/services/chatbotService.js`
  - Engine: `backend/src/services/chatbot/core/Engine.js`
- **Chuỗi xử lý:**
  1. Kiểm tra input, cắt lịch sử hội thoại.
  2. Suy luận vị trí (GPS nếu có).
  3. Dựng system prompt theo role.
  4. Gọi LLM, nhận tool_calls.
  5. Thực thi tool song song, format kết quả.
  6. Trả `message` + `toolResults`.
- **Fallback tool-call:** Khi LLM trả về `<tool_call>` dạng text, hệ thống tự parse và thực thi (toolCallFallback).
- **Endpoints bổ trợ:**
  - `GET /api/chatbot/weather`
  - `GET /api/chatbot/export/:filename` (tải báo cáo)

## 4. Core Engine chi tiết
Tập trung trong `Engine.js`:
- **Intent inference:** Phân tích ý định (booking/search/weather) bằng LLM khi cần.
- **Bypass trực tiếp:**
  - Booking intent: tạo form đặt sân nhanh.
  - Weather intent: gọi `get_weather` theo GPS/city.
  - UUID bypass: nhận ID từ UI, mở form ngay.
  - Command bypass: `toolName key=value` cho test/dev.
- **Orchestration:** Thực thi nhiều tool song song.
- **UI-driven results:** Nếu kết quả thuộc nhóm UI (booking_form, venues, weather, ...), bỏ qua narration pass.
- **Sanitize output:** Xóa tool tags/UI markers trước khi hiển thị.

## 5. Action Registry & RBAC
- **Auto-load actions:** Registry tự quét `*.action.js` khi khởi động.
- **RBAC:** Chỉ expose tool phù hợp role (CUSTOMER/OWNER/ADMIN); chặn thực thi nếu không đủ quyền.
- **Điểm kiểm soát:** `Registry.getToolDefinitions()` và `Registry.executeAction()`.

## 6. Danh mục Actions & khả năng chính
### 6.1 Tìm kiếm & gợi ý
- `search_venues` → danh sách sân phù hợp
- `get_venue_detail` → chi tiết 1 sân
- `search_available_fields` → lọc sân trống theo tiêu chí

### 6.2 Lịch trống & đặt sân
- `get_available_time_slots` → lịch trống theo ngày
- `create_booking` → tạo booking hoặc form
- `cancel_booking` → hủy booking
- `get_my_bookings` → danh sách booking của user

### 6.3 Thời tiết
- `get_weather` → dự báo thời tiết theo GPS/city

### 6.4 FAQ/RAG
- `search_faq` → tra cứu `knowledge_base.json`

### 6.5 Owner/Admin
- `get_owner_venues`
- `get_owner_booking_summary`
- `get_platform_stats`
- `get_top_owners`
- `export_platform_report`, `export_revenue_report`, `export_booking_report`

### 6.6 Khác
- `get_solar_date`
- `ask_clarification`

### 6.7 Kiểu kết quả chính
`venues`, `venue_detail`, `available_slots`, `booking_form`, `booking_created`, `booking_cancelled`, `weather`, `knowledge`, `file_download`, `clarification`, `options`.

## 7. Nguồn dữ liệu & tích hợp
- **Database:** Prisma (venues, fields, bookings, reviews, users).
- **Knowledge base:** `backend/src/services/chatbot/docs/knowledge_base.json`.
- **Weather service:** `backend/src/services/weatherService.js`.
- **Export file:** lưu trong `backend/exports`, tải qua `/api/chatbot/export/:filename`.

## 8. Frontend trải nghiệm chatbot
### Entry points
- **/chat page:** `frontend/src/app/chat/page.js`
- **GlobalChatBubble (floating):** `frontend/src/components/chat/GlobalChatBubble.js`
- **ChatbotWidget:** `frontend/src/components/ChatbotWidget.js`

### UI hiển thị kết quả
- Dùng `ChatCardRenderer` và `BotToolResults` để render toolResults.

### Booking form & chọn khung giờ
- Tự sinh slot local + gọi `bookingsAPI.getFieldSlots` để chặn trùng.
- UI hỗ trợ chọn khoảng giờ, tính giá, xác nhận đặt sân.

### Lưu lịch sử & đồng bộ
- Lưu sessionStorage: `sportapp-ai-chat-history-v2-*`.
- Đồng bộ cùng tab qua custom events.

### Shortcut thời tiết
- Tự nhận diện câu hỏi thời tiết và build command `get_weather`.

## 9. Bảo mật & an toàn
- Chatbot API bắt buộc auth (middleware).
- RBAC ở Registry đảm bảo không lộ tool theo role.
- Sanitize tool-call text để tránh chèn nội dung độc hại.
- Endpoint export có kiểm tra path traversal (sanitize filename).

## 10. Cấu hình & vận hành
- **LM Studio:** `LM_STUDIO_URL`, `LM_STUDIO_MODEL`
- **Frontend API:** `NEXT_PUBLIC_API_URL`
- Logging/handling lỗi ở `Engine.js` và controllers.

## 11. Kiểm thử/QA
- **Script kiểm thử:** `backend/scripts/test-chatbot-tool-fallback.js`
- **Test thủ công đề xuất:**
  - Tìm sân theo tên/khu vực
  - Đặt sân từ chatbot → booking form → xác nhận
  - Hủy booking
  - Thời tiết theo GPS/city
  - FAQ/RAG theo chính sách
  - Xuất báo cáo (owner/admin)

## 12. Hạn chế & hướng phát triển
- **Hạn chế:** phụ thuộc LLM local (LM Studio) và chất lượng prompt.
- **Hướng phát triển:**
  - Mở rộng action theo domain mới.
  - Nâng cấp RAG/knowledge base.
  - Thêm theo dõi chất lượng hội thoại, phản hồi từ người dùng.
