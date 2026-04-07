const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/chat/rooms
const getRooms = async (req, res, next) => {
    try {
        const memberships = await prisma.chatRoomMember.findMany({
            where: { userId: req.user.id },
            include: {
                room: {
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, fullName: true, avatarUrl: true } },
                            },
                        },
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
        });

        const rooms = memberships.map(m => ({
            ...m.room,
            lastMessage: m.room.messages[0] || null,
            unreadCount: 0,
        }));

        res.json({ success: true, data: { rooms } });
    } catch (error) {
        next(error);
    }
};

// GET /api/chat/rooms/:roomId/messages
const getMessages = async (req, res, next) => {
    try {
        const membership = await prisma.chatRoomMember.findFirst({
            where: { roomId: req.params.roomId, userId: req.user.id },
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Not a member of this room' });
        }

        const { cursor, limit = 50 } = req.query;

        const where = { roomId: req.params.roomId };
        if (cursor) {
            where.createdAt = { lt: new Date(cursor) };
        }

        const messages = await prisma.message.findMany({
            where,
            include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
            },
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
        });

        await prisma.message.updateMany({
            where: {
                roomId: req.params.roomId,
                senderId: { not: req.user.id },
                isRead: false,
            },
            data: { isRead: true },
        });

        res.json({
            success: true,
            data: { messages: messages.reverse() },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/rooms
const createRoom = async (req, res, next) => {
    try {
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Target user ID required' });
        }

        const existingMemberships = await prisma.chatRoomMember.findMany({
            where: { userId: req.user.id },
            include: {
                room: {
                    include: { members: true },
                },
            },
        });

        const existingRoom = existingMemberships.find(m =>
            m.room.type === 'DIRECT' &&
            m.room.members.length === 2 &&
            m.room.members.some(mem => mem.userId === targetUserId)
        );

        if (existingRoom) {
            return res.json({
                success: true,
                data: { room: existingRoom.room, isNew: false },
            });
        }

        const room = await prisma.chatRoom.create({
            data: {
                type: 'DIRECT',
                members: {
                    create: [
                        { userId: req.user.id },
                        { userId: targetUserId },
                    ],
                },
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, fullName: true, avatarUrl: true } },
                    },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: { room, isNew: true },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/rooms/:roomId/messages
const sendMessage = async (req, res, next) => {
    try {
        const membership = await prisma.chatRoomMember.findFirst({
            where: { roomId: req.params.roomId, userId: req.user.id },
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }

        const { content, type } = req.body;

        const message = await prisma.message.create({
            data: {
                roomId: req.params.roomId,
                senderId: req.user.id,
                content,
                type: type || 'TEXT',
            },
            include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        res.status(201).json({
            success: true,
            data: { message },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getRooms, getMessages, createRoom, sendMessage };
