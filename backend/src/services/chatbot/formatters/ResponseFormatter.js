/**
 * ResponseFormatter
 * Responsibility: Converts raw data from database tools into human-friendly Vietnamese summaries.
 * Ensures the AI provides concise and accurate information about venues, bookings, and reports.
 */
class ResponseFormatter {
    /**
     * Formats tool results into a text summary.
     * @param {string} type - Tool result type (venues, venue_detail, booking_created, etc.)
     * @param {object} result - The result object returned by the tool logic.
     */
    format(type, result) {
        if (!result.success) return `Lỗi: ${result.message}`;

        const data = result.data;
        const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p) + 'đ';

        switch (type) {
            case 'venues':
                if (!data || data.length === 0) return `[Hệ thống] Không tìm thấy bất kỳ sân thể thao nào phù hợp trong khu vực này. Bạn PHẢI thông báo khách hàng hiện tại hệ thống chưa có sân ở đây.`;
                return `Tìm thấy ${data.length} sân phù hợp. Gồm: ${data.map(v => `${v.name} (${v.district || 'N/A'}, ${v.city || 'N/A'})`).join(', ')}.`;
            
            case 'venue_detail':
                return `Sân ${data.name}: ${data.address}. ${data.avgRating > 0 ? 'Đánh giá: ' + data.avgRating + '/5.' : 'Chưa có đánh giá.'}`;
            
            case 'available_slots':
                return `Ngày ${data.date} còn ${data.slots.length} khung giờ trống: ${data.slots.map(s => s.time).join(', ')}.`;

            case 'booking_created':
                return `Đặt sân thành công cho ${data.venueName} - ${data.fieldName} ngay ${data.date} lúc ${data.time}. Chi phí: ${formatPrice(data.totalPrice)}. BOOKING_ID: ${data.bookingId}.`;

            case 'owner_booking_summary': {
                const s = data;
                const times = (s.recentBookings || []).map(b => `[${b.time} ${b.date}]`).join(', ');
                return `Thống kê (${s.from || 'toàn thời gian'}): ${s.totalCount} tổng đơn, Doanh thu: ${formatPrice(s.totalRevenue)}. (Chi tiết: ${s.successCount} đơn thành công, ${s.statusCounts.PENDING_DEPOSIT} chờ cọc). ${times ? 'Các đơn: ' + times : ''}`;
            }

            case 'file_download':
                return `Báo cáo đã sẵn sàng tại: ${data.downloadUrl}`;

            case 'clarification':
                return `[UI_INTERACTION:CLARIFICATION] ${data.question}. Các lựa chọn: ${data.options.join(', ')}`;
            
            case 'platform_stats':
                return `Toàn sàn (${data.from} - ${data.to}): ${data.totalUsers} người dùng, ${data.totalVenues} sân, ${data.totalBookings} đơn, Doanh thu: ${formatPrice(data.totalRevenue)}.`;

            case 'top_owners':
                return `Bảng xếp hạng chủ sân: ` + data.map((o, i) => `${i + 1}. ${o.name}: ${formatPrice(o.revenue)} (${o.bookingCount} đơn)`).join('| ');

            case 'owner_venues':
                return `Danh sách sân của bạn: ` + data.map(v => v.name).join(' | ');

            case 'date_conversion':
                return data.message;

            case 'booking_form': {
                const fieldNames = {
                    date: 'Ngày đặt sân',
                    startTime: 'Giờ bắt đầu',
                    time: 'Khung giờ đặt',
                    payment: 'Phương thức thanh toán',
                    fieldId: 'Loại sân con'
                };

                const missing = (data.missingFields || []).map(f => fieldNames[f] || f);
                const provided = Object.keys(data.currentArgs || {})
                    .filter(k => data.currentArgs[k] && fieldNames[k])
                    .map(k => fieldNames[k]);

                let baseMsg = `Tuyệt vời! Bạn đang đặt sân tại ${data.venueName}. `;
                if (provided.length > 0) {
                    baseMsg += `Tôi đã ghi nhận thông tin về: ${provided.join(', ')}. `;
                }

                if (missing.length > 0) {
                    baseMsg += `Bạn vui lòng điền nốt ${missing.join(', ')} ở biểu mẫu bên dưới để hoàn tất nhé:`;
                } else {
                    baseMsg += `Bạn vui lòng kiểm tra lại thông tin và xác nhận ở biểu mẫu bên dưới nhé:`;
                }

                return baseMsg;
            }

            default:
                return JSON.stringify(result);
        }
    }
}

module.exports = new ResponseFormatter();
