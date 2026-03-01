const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

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
        console.log(`🔌 User connected: ${socket.user.fullName} (${socket.user.id})`);

        // Join user's personal room for notifications
        socket.join(`user:${socket.user.id}`);

        // Join a chat room
        socket.on('join-room', async (roomId) => {
            try {
                // Verify membership
                const membership = await prisma.chatRoomMember.findFirst({
                    where: { roomId, userId: socket.user.id },
                });

                if (membership) {
                    socket.join(`room:${roomId}`);
                    console.log(`${socket.user.fullName} joined room: ${roomId}`);
                }
            } catch (err) {
                console.error('Join room error:', err);
            }
        });

        // Leave a chat room
        socket.on('leave-room', (roomId) => {
            socket.leave(`room:${roomId}`);
        });

        // Send a message
        socket.on('send-message', async ({ roomId, content, type }) => {
            try {
                // Verify membership
                const membership = await prisma.chatRoomMember.findFirst({
                    where: { roomId, userId: socket.user.id },
                });

                if (!membership) return;

                // Save message
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

                // Broadcast to room
                io.to(`room:${roomId}`).emit('new-message', message);

                // Notify other members who are not in the room
                const members = await prisma.chatRoomMember.findMany({
                    where: { roomId, userId: { not: socket.user.id } },
                });

                for (const member of members) {
                    io.to(`user:${member.userId}`).emit('message-notification', {
                        roomId,
                        message,
                    });
                }
            } catch (err) {
                console.error('Send message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing', ({ roomId, isTyping }) => {
            socket.to(`room:${roomId}`).emit('user-typing', {
                userId: socket.user.id,
                fullName: socket.user.fullName,
                isTyping,
            });
        });

        // Mark messages as read
        socket.on('mark-read', async ({ roomId }) => {
            try {
                await prisma.message.updateMany({
                    where: {
                        roomId,
                        senderId: { not: socket.user.id },
                        isRead: false,
                    },
                    data: { isRead: true },
                });

                socket.to(`room:${roomId}`).emit('messages-read', {
                    userId: socket.user.id,
                    roomId,
                });
            } catch (err) {
                console.error('Mark read error:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.user.fullName}`);
        });
    });
}

module.exports = { setupSocket };
