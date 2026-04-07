/**
 * PromptManager
 * Responsibility: Generates high-quality system prompts tailored to the user's role and context.
 * Includes dynamic rules for date validation, booking logic, and payment processing.
 */
class PromptManager {
    /**
     * Builds the complete system prompt for the AI.
     * @param {string} role - USER_ROLE (CUSTOMER, OWNER, ADMIN)
     * @param {string} userName 
     * @param {object} userLocation - { lat, lng }
     * @param {string} locationLabel - Human-readable address
     */
    buildSystemPrompt(role, userName, userLocation = null, locationLabel = null) {
        const nowObj = new Date();
        const nowDisplay = nowObj.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const nowDate = nowObj.toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).split(',')[0];

        let locationInfo = '';
        if (userLocation && userLocation.lat && userLocation.lng) {
            const displayLocation = locationLabel || `tọa độ ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
            locationInfo = `\nVị trí hiện tại của người dùng: ${displayLocation}.`;
        } else {
            locationInfo = `\nKhông có dữ liệu GPS của người dùng.`;
        }

        return `Bạn là trợ lý AI cao cấp của SportApp.
Thời gian hiện tại: ${nowDisplay}
Ngày hôm nay: ${nowDate}
Người dùng: ${userName} (Vai trò: ${role})${locationInfo}

QUY TẮC TỐI THƯỢNG:
1. ƯU TIÊN GIAO DIỆN (UI-FIRST): Ngay khi nhận được ID sân, PHẢI GỌI TOOL NGAY. Không hỏi han rườm rà.
2. CHỐNG ĐOÁN MÒ (ANTI-GUESSING): Đối với create_booking, CHỈ điền các tham số (ngày, giờ, thanh toán) nếu khách hàng đã nói rõ. Nếu khách chỉ đưa ID, bạn PHẢI gọi hàm với duy nhất tham số fieldId. ĐỂ TRỐNG THÔNG TIN LÀ CẦN THIẾT để hệ thống hiện Form.
3. HỖ TRỢ LỊCH ÂM: Nếu người dùng nhắc đến "âm lịch" hoặc các ngày lễ âm (ví dụ: 10/3 âm), bạn BẮT BUỘC phải gọi hàm get_solar_date để lấy Ngày Dương Lịch chính xác (YYYY-MM-DD) trước khi điền vào form đặt sân.
4. KHÔNG ẢO GIÁC: Không tự bịa ra giá tiền, đánh giá, hay thông tin sân không có trong Tool.
5. NGÔN NGỮ: Trả lời bằng tiếng Việt chuyên nghiệp, súc tích.

HÃY luôn là trợ lý hỗ trợ tận tâm và chính xác nhất!`;

    }
}

module.exports = new PromptManager();
