const jwt = require('jsonwebtoken');

// Track online users: userId -> Set of socketIds (supports multiple tabs/devices)
const onlineUsers = new Map();

/**
 * Setup Socket.io for real-time chat
 */
function setupSocket(io, prisma) {
    // Authentication middleware for socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, fullName: true, avatarUrl: true },
            });

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`🔌 User connected: ${socket.user.fullName} (${userId})`);

        // ── Track online status ──
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast to ALL other users that this user came online
        socket.broadcast.emit('user_online', { userId });

        // Send current online users list to the newly connected user
        const onlineIds = Array.from(onlineUsers.keys());
        socket.emit('online_users', onlineIds);

        // Join user's personal room for global notifications
        socket.join(`user:${userId}`);

        // 1. Join a chat room
        socket.on('join_room', async (roomId) => {
            try {
                const membership = await prisma.chatRoomMember.findFirst({
                    where: { roomId, userId: socket.user.id },
                });

                if (membership) {
                    socket.join(roomId);
                    console.log(`${socket.user.fullName} joined room: ${roomId}`);
                }
            } catch (err) {
                console.error('Join room error:', err);
            }
        });

        // Leave a chat room
        socket.on('leave_room', (roomId) => {
            socket.leave(roomId);
        });

        // 2. Send a message
        socket.on('send_message', async ({ roomId, content, type }) => {
            try {
                const membership = await prisma.chatRoomMember.findFirst({
                    where: { roomId, userId: socket.user.id },
                });

                if (!membership) return;

                // Lưu vào database
                const message = await prisma.message.create({
                    data: {
                        roomId,
                        senderId: socket.user.id,
                        content,
                        type: type || 'TEXT',
                    },
                    include: {
                        sender: { select: { id: true, fullName: true, avatarUrl: true } },
                    },
                });

                // Gửi tin nhắn cho những người KHÁC trong phòng
                socket.to(roomId).emit('new_message', message);

                // Gửi thông báo cho các thành viên không mở khung chat
                const members = await prisma.chatRoomMember.findMany({
                    where: { roomId, userId: { not: socket.user.id } },
                });

                for (const member of members) {
                    io.to(`user:${member.userId}`).emit('message_notification', {
                        roomId,
                        message,
                    });
                }
            } catch (err) {
                console.error('Send message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // 3. Typing indicator
        socket.on('typing', ({ roomId, userId, fullName }) => {
            socket.to(roomId).emit('user_typing', {
                userId,
                fullName,
                roomId
            });
        });

        // 4. Mark messages as read
        socket.on('mark_read', async ({ roomId, messageId }) => {
            try {
                if (messageId) {
                    await prisma.message.update({
                        where: { id: messageId },
                        data: { isRead: true },
                    });
                    socket.to(roomId).emit('message_read', { messageId, roomId });
                } else {
                    await prisma.message.updateMany({
                        where: {
                            roomId,
                            senderId: { not: socket.user.id },
                            isRead: false,
                        },
                        data: { isRead: true },
                    });
                    socket.to(roomId).emit('all_messages_read', {
                        userId: socket.user.id,
                        roomId,
                    });
                }
            } catch (err) {
                console.error('Mark read error:', err);
            }
        });

        // ── Disconnect: update online status ──
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.user.fullName} (${userId})`);

            // Remove this socket from user's set
            if (onlineUsers.has(userId)) {
                onlineUsers.get(userId).delete(socket.id);

                // Only mark offline if user has NO remaining connections (all tabs closed)
                if (onlineUsers.get(userId).size === 0) {
                    onlineUsers.delete(userId);
                    // Broadcast offline to all
                    socket.broadcast.emit('user_offline', { userId });
                    console.log(`🔴 ${socket.user.fullName} is now offline`);
                }
            }
        });
    });
}

module.exports = { setupSocket };
