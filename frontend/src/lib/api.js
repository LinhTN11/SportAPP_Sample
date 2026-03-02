import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('sportapp_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('sportapp_token');
                localStorage.removeItem('sportapp_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    listUsers: (params) => api.get('/users', { params }),
};

// Venues API
export const venuesAPI = {
    create: (data) => api.post('/venues', data),
    list: (params) => api.get('/venues', { params }),
    getById: (id) => api.get(`/venues/${id}`),
    update: (id, data) => api.put(`/venues/${id}`, data),
    getMyVenues: () => api.get('/venues/owner/my-venues'),
    getPending: () => api.get('/venues/admin/pending'),
    approve: (id) => api.post(`/venues/${id}/approve`),
    reject: (id, reason) => api.post(`/venues/${id}/reject`, { reason }),
};

// Fields API
export const fieldsAPI = {
    create: (venueId, data) => api.post(`/fields/${venueId}`, data),
    getByVenue: (venueId) => api.get(`/fields/venue/${venueId}`),
    update: (id, data) => api.put(`/fields/${id}`, data),
    delete: (id) => api.delete(`/fields/${id}`),
    toggle: (id, isActive) => api.put(`/fields/${id}`, { isActive }),
    createPricing: (fieldId, data) => api.post(`/fields/${fieldId}/pricing`, data),
    getPricing: (fieldId) => api.get(`/fields/${fieldId}/pricing`),
    updatePricing: (ruleId, data) => api.put(`/fields/pricing/${ruleId}`, data),
    deletePricing: (ruleId) => api.delete(`/fields/pricing/${ruleId}`),
};

// Upload API
export const uploadAPI = {
    single: (file) => {
        const fd = new FormData();
        fd.append('image', file);
        return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    multiple: (files) => {
        const fd = new FormData();
        files.forEach(f => fd.append('images', f));
        return api.post('/upload/multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
};

// Bookings API
export const bookingsAPI = {
    search: (data) => api.post('/bookings/search', data),
    create: (data) => api.post('/bookings', data),
    confirm: (id) => api.post(`/bookings/${id}/confirm`),
    cancel: (id) => api.post(`/bookings/${id}/cancel`),
    getMyBookings: (params) => api.get('/bookings/my', { params }),
    getVenueBookings: (venueId, params) => api.get(`/bookings/venue/${venueId}`, { params }),
    getFieldSlots: (fieldId, date) => api.get(`/bookings/field/${fieldId}/slots`, { params: { date } }),
};

// Matchmaking API
export const matchmakingAPI = {
    createPost: (data) => api.post('/matchmaking/posts', data),
    searchPosts: (params) => api.get('/matchmaking/posts', { params }),
    getMyPosts: () => api.get('/matchmaking/posts/my'),
    sendRequest: (postId) => api.post(`/matchmaking/posts/${postId}/request`),
    acceptRequest: (id) => api.post(`/matchmaking/requests/${id}/accept`),
    rejectRequest: (id) => api.post(`/matchmaking/requests/${id}/reject`),
    cancelRequest: (id) => api.post(`/matchmaking/requests/${id}/cancel`),
};

// Chat API
export const chatAPI = {
    getRooms: () => api.get('/chat/rooms'),
    getMessages: (roomId, params) => api.get(`/chat/rooms/${roomId}/messages`, { params }),
    createRoom: (targetUserId) => api.post('/chat/rooms', { targetUserId }),
    sendMessage: (roomId, data) => api.post(`/chat/rooms/${roomId}/messages`, data),
};

// Reviews API
export const reviewsAPI = {
    create: (data) => api.post('/reviews', data),
    getByVenue: (venueId, params) => api.get(`/reviews/venue/${venueId}`, { params }),
};

// Notifications API
export const notificationsAPI = {
    list: (params) => api.get('/notifications', { params }),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
};

// Payments API
export const paymentsAPI = {
    mockPay: (data) => api.post('/payments/mock-pay', data),
    getByBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
};

export default api;
