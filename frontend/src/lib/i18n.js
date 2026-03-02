// SportApp – Internationalization (i18n)

const translations = {
    vi: {
        // Nav
        'nav.findVenue': 'Tìm sân',
        'nav.matchmaking': 'Ghép trận',
        'nav.chat': 'Tin nhắn',
        'nav.myBookings': 'Đặt sân của tôi',
        'nav.manageVenues': 'Quản lý sân',
        'nav.schedule': 'Lịch đặt',
        'nav.approveVenues': 'Duyệt sân',
        'nav.users': 'Người dùng',
        'nav.profile': 'Hồ sơ cá nhân',
        'nav.logout': 'Đăng xuất',
        'nav.login': 'Đăng nhập',
        'nav.register': 'Đăng ký',

        // Auth
        'auth.login': 'Đăng nhập',
        'auth.register': 'Đăng ký',
        'auth.email': 'Email',
        'auth.password': 'Mật khẩu',
        'auth.fullName': 'Họ và tên',
        'auth.phone': 'Số điện thoại',
        'auth.welcomeBack': 'Chào mừng bạn quay lại SportApp',
        'auth.createAccount': 'Tạo tài khoản',
        'auth.joinToday': 'Tham gia SportApp ngay hôm nay',
        'auth.noAccount': 'Chưa có tài khoản?',
        'auth.hasAccount': 'Đã có tài khoản?',
        'auth.loginFailed': 'Đăng nhập thất bại',
        'auth.registerFailed': 'Đăng ký thất bại',
        'auth.customer': 'Khách hàng',
        'auth.owner': 'Chủ sân',

        // Home
        'home.badge': '🚀 Nền tảng thể thao thông minh',
        'home.title1': 'Đặt sân. Ghép trận.',
        'home.title2': 'Tất cả trong một.',
        'home.desc': 'Tìm và đặt sân thể thao chỉ trong vài phút. Ghép đối thủ tự động hoặc thủ công.',
        'home.findNow': '🏟️ Tìm sân ngay',
        'home.startFree': 'Bắt đầu miễn phí',
        'home.whyUs': 'Tại sao chọn SportApp?',
        'home.whyUsDesc': 'Mọi thứ bạn cần cho trải nghiệm thể thao hoàn hảo',
        'home.howItWorks': 'Cách hoạt động',
        'home.steps': '3 bước đơn giản để bắt đầu',

        // Venues
        'venues.title': 'Tìm sân thể thao',
        'venues.subtitle': 'Khám phá và đặt sân gần bạn',
        'venues.allSports': 'Tất cả môn',
        'venues.searchCity': 'Tìm theo thành phố...',
        'venues.noVenues': 'Chưa có sân nào',
        'venues.active': 'Đang hoạt động',

        // Booking
        'booking.title': 'Đặt sân',
        'booking.selectField': 'Chọn sân ở danh sách bên trái',
        'booking.date': 'Ngày chơi',
        'booking.from': 'Từ',
        'booking.to': 'Đến',
        'booking.payment': 'Thanh toán',
        'booking.atVenue': 'Tại sân',
        'booking.online': 'Online',
        'booking.deposit': 'Cọc 10% online',
        'booking.payAll': 'Thanh toán toàn bộ',
        'booking.confirm': 'Xác nhận đặt sân',
        'booking.total': 'Tổng tiền',
        'booking.depositAmount': 'Tiền cọc (10%)',
        'booking.holdTime': 'Giữ chỗ',
        'booking.payNow': '💳 Thanh toán ngay',
        'booking.success': 'Đặt sân thành công!',
        'booking.successMsg': 'Bạn sẽ nhận được thông báo xác nhận.',

        // Matchmaking
        'match.title': 'Ghép trận 🤝',
        'match.subtitle': 'Tìm đối thủ hoặc để hệ thống tự ghép cho bạn',
        'match.browse': '🔍 Tìm đối',
        'match.myPosts': '📋 Bài của tôi',
        'match.create': '✏️ Tạo bài',
        'match.sendRequest': '🤝 Gửi lời mời',
        'match.autoMatch': 'Ghép tự động',
        'match.autoMatchDesc': 'Hệ thống tự tìm người trùng điều kiện',

        // Common
        'common.all': 'Tất cả',
        'common.cancel': 'Hủy',
        'common.save': 'Lưu',
        'common.back': 'Quay lại',
        'common.loading': 'Đang tải...',
        'common.noData': 'Không có dữ liệu',
        'common.minutes': 'phút',
    },

    en: {
        // Nav
        'nav.findVenue': 'Find Venue',
        'nav.matchmaking': 'Matchmaking',
        'nav.chat': 'Messages',
        'nav.myBookings': 'My Bookings',
        'nav.manageVenues': 'Manage Venues',
        'nav.schedule': 'Schedule',
        'nav.approveVenues': 'Approve Venues',
        'nav.users': 'Users',
        'nav.profile': 'Profile',
        'nav.logout': 'Logout',
        'nav.login': 'Login',
        'nav.register': 'Register',

        // Auth
        'auth.login': 'Login',
        'auth.register': 'Register',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.fullName': 'Full Name',
        'auth.phone': 'Phone Number',
        'auth.welcomeBack': 'Welcome back to SportApp',
        'auth.createAccount': 'Create Account',
        'auth.joinToday': 'Join SportApp today',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',
        'auth.loginFailed': 'Login failed',
        'auth.registerFailed': 'Registration failed',
        'auth.customer': 'Customer',
        'auth.owner': 'Venue Owner',

        // Home
        'home.badge': '🚀 Smart Sports Platform',
        'home.title1': 'Book Fields. Find Opponents.',
        'home.title2': 'All in One.',
        'home.desc': 'Find and book sports fields in minutes. Auto or manual opponent matching.',
        'home.findNow': '🏟️ Find a Field',
        'home.startFree': 'Start for Free',
        'home.whyUs': 'Why SportApp?',
        'home.whyUsDesc': 'Everything for your perfect sports experience',
        'home.howItWorks': 'How it Works',
        'home.steps': '3 simple steps to get started',

        // Venues
        'venues.title': 'Find Sports Fields',
        'venues.subtitle': 'Discover and book fields near you',
        'venues.allSports': 'All Sports',
        'venues.searchCity': 'Search by city...',
        'venues.noVenues': 'No venues found',
        'venues.active': 'Active',

        // Booking
        'booking.title': 'Book a Field',
        'booking.selectField': 'Select a field from the list',
        'booking.date': 'Date',
        'booking.from': 'From',
        'booking.to': 'To',
        'booking.payment': 'Payment',
        'booking.atVenue': 'Pay at Venue',
        'booking.online': 'Online',
        'booking.deposit': '10% deposit online',
        'booking.payAll': 'Pay in full',
        'booking.confirm': 'Confirm Booking',
        'booking.total': 'Total',
        'booking.depositAmount': 'Deposit (10%)',
        'booking.holdTime': 'Hold time',
        'booking.payNow': '💳 Pay Now',
        'booking.success': 'Booking Confirmed!',
        'booking.successMsg': 'You will receive a confirmation notification.',

        // Matchmaking
        'match.title': 'Matchmaking 🤝',
        'match.subtitle': 'Find opponents or let the system auto-match',
        'match.browse': '🔍 Browse',
        'match.myPosts': '📋 My Posts',
        'match.create': '✏️ Create Post',
        'match.sendRequest': '🤝 Send Request',
        'match.autoMatch': 'Auto Match',
        'match.autoMatchDesc': 'System finds matching players automatically',

        // Common
        'common.all': 'All',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.back': 'Back',
        'common.loading': 'Loading...',
        'common.noData': 'No data',
        'common.minutes': 'min',
    },
};

export function getTranslation(lang = 'vi') {
    const t = translations[lang] || translations.vi;
    return (key) => t[key] || key;
}

export function getLanguages() {
    return [
        { code: 'vi', label: '🇻🇳 Tiếng Việt' },
        { code: 'en', label: '🇬🇧 English' },
    ];
}

export default translations;
