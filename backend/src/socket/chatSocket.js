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

        const emitToRoom = (roomId, eventName, payload) => {
            io.to(roomId).emit(eventName, payload);
            io.to(`room:${roomId}`).emit(eventName, payload);
        };

        const emitToUser = (targetUserId, eventName, payload) => {
            io.to(`user:${targetUserId}`).emit(eventName, payload);
        };

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
        const handleJoinRoom = async (roomId) => {
            try {
                const membership = await prisma.chatRoomMember.findFirst({
                    where: { roomId, userId: socket.user.id },
                });

                if (membership) {
                    socket.join(roomId);
                    socket.join(`room:${roomId}`);
                    console.log(`${socket.user.fullName} joined room: ${roomId}`);
                }
            } catch (err) {
                console.error('Join room error:', err);
            }
        };

        socket.on('join_room', handleJoinRoom);

        // Leave a chat room
        const handleLeaveRoom = (roomId) => {
            socket.leave(roomId);
            socket.leave(`room:${roomId}`);
        };

        socket.on('leave_room', handleLeaveRoom);

        // 2. Send a message
        const handleSendMessage = async ({ roomId, content, type }) => {
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
                socket.to(`room:${roomId}`).emit('new_message', message);

                // Gửi thông báo cho các thành viên không mở khung chat
                const members = await prisma.chatRoomMember.findMany({
                    where: { roomId, userId: { not: socket.user.id } },
                });

                for (const member of members) {
                    const payload = {
                        roomId,
                        message,
                    };
                    emitToUser(member.userId, 'message_notification', payload);
                }
            } catch (err) {
                console.error('Send message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        };

        socket.on('send_message', handleSendMessage);

        // 3. Typing indicator
        socket.on('typing', ({ roomId, userId, fullName }) => {
            const payload = {
                userId,
                fullName,
                roomId
            };
            socket.to(roomId).emit('user_typing', payload);
            socket.to(`room:${roomId}`).emit('user_typing', payload);
        });

        // 4. Mark messages as read
        const handleMarkRead = async ({ roomId, messageId }) => {
            try {
                if (messageId) {
                    await prisma.message.update({
                        where: { id: messageId },
                        data: { isRead: true },
                    });
                    const payload = { messageId, roomId };
                    emitToRoom(roomId, 'message_read', payload);
                } else {
                    await prisma.message.updateMany({
                        where: {
                            roomId,
                            senderId: { not: socket.user.id },
                            isRead: false,
                        },
                        data: { isRead: true },
                    });
                    const payload = {
                        userId: socket.user.id,
                        roomId,
                    };
                    emitToRoom(roomId, 'all_messages_read', payload);
                    emitToUser(socket.user.id, 'all_messages_read', payload);
                }
            } catch (err) {
                console.error('Mark read error:', err);
            }
        };

        socket.on('mark_read', handleMarkRead);

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
