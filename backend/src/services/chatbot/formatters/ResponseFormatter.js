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
                if (!data || data.length === 0) {
                    if (result.meta?.searchMethod === 'name_not_found') {
                        return `Không tìm thấy sân có tên "${result.meta.query}". Bạn hãy kiểm tra lại tên sân hoặc cho tôi thêm khu vực/thành phố để tìm chính xác hơn.`;
                    }
                    return `[Hệ thống] Không tìm thấy bất kỳ sân thể thao nào phù hợp trong khu vực này. Bạn PHẢI thông báo khách hàng hiện tại hệ thống chưa có sân ở đây.`;
                }
                return `Tìm thấy ${data.length} sân phù hợp. Mình đã hiển thị danh sách bên dưới để bạn dễ dàng lựa chọn.`;
            
            case 'venue_detail':
                return `Sân ${data.name}: ${data.address}. ${data.avgRating > 0 ? 'Đánh giá: ' + data.avgRating + '/5.' : 'Chưa có đánh giá.'}`;
            
            case 'available_slots':
                return `Mình đã tìm thấy ${data.slots.length} khung giờ trống cho ngày ${data.date}. Bạn vui lòng chọn giờ muốn đặt ở bảng bên dưới nhé.`;

            case 'booking_created':
                return `Đặt sân thành công cho ${data.venueName} - ${data.fieldName} ngay ${data.date} lúc ${data.time}. Chi phí: ${formatPrice(data.totalPrice)}. BOOKING_ID: ${data.bookingId}.`;

            case 'booking_cancelled':
                return `Đã hủy booking ${data.bookingId}. Bạn có thể đặt lại ngay bên dưới.`;

            case 'bookings':
                return `Mình đã tìm thấy ${data.length} đơn đặt sân trong lịch sử của bạn. Chi tiết hiển thị ở danh sách bên dưới nhé.`;

            case 'weather': {
                const location = data.locationLabel || data.city || 'vị trí hiện tại';
                const current = data.current || {};
                const warnings = Array.isArray(data.warnings) && data.warnings.length > 0
                    ? ` Cảnh báo: ${data.warnings[0].message}`
                    : '';
                return `Thời tiết tại ${location}: ${current.icon || ''} ${current.description || 'Không rõ'}, ${current.temperature ?? '-'}°C, độ ẩm ${current.humidity ?? '-'}%, gió ${current.windSpeed ?? '-'} km/h.${warnings}`;
            }

            case 'owner_booking_summary': {
                const s = data;
                return `Thống kê (${s.from || 'toàn thời gian'}): Có tổng cộng ${s.totalCount} đơn đặt sân với doanh thu ${formatPrice(s.totalRevenue)}. (Chi tiết: ${s.successCount} đơn thành công, ${s.statusCounts.PENDING_DEPOSIT} chờ cọc). Chi tiết từng đơn được liệt kê bên dưới.`;
            }

            case 'file_download':
                return `Báo cáo đã sẵn sàng tại: ${data.downloadUrl}`;

            case 'clarification':
                return `${data.question}. Các lựa chọn: ${data.options.join(', ')}`;

            case 'options': {
                const optionNames = (data.fields || data.availableFields || []).map(f => f.name).filter(Boolean);
                if (optionNames.length > 0) {
                    return `Mình đã tìm thấy sân phù hợp tại ${data.venueName || 'địa điểm này'}. Bạn vui lòng chọn sân con: ${optionNames.join(', ')}`;
                }
                return `Mình đã tìm thấy sân phù hợp. Bạn vui lòng chọn một tùy chọn bên dưới.`;
            }
            
            case 'platform_stats':
                return `Toàn sàn (${data.from} - ${data.to}): ${data.totalUsers} người dùng, ${data.totalVenues} sân, ${data.totalBookings} đơn, Doanh thu: ${formatPrice(data.totalRevenue)}.`;

            case 'top_owners':
                return `Đây là danh sách ${data.length} chủ sân có kết quả kinh doanh tốt nhất. Bạn có thể xem thứ hạng chi tiết bên dưới.`;

            case 'owner_venues':
                return `Bạn hiện có ${data.length} sân đang hoạt động trên hệ thống. Chi tiết danh sách được hiển thị bên dưới.`;

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
