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
                                user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
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
                        user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
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

        // Trigger socket.io event if initialized
        const io = req.app.get('io');
        if (io) {
            io.to(`room:${req.params.roomId}`).emit('new-message', message);

            const otherMembers = await prisma.chatRoomMember.findMany({
                where: { roomId: req.params.roomId, userId: { not: req.user.id } },
            });
            for (const member of otherMembers) {
                io.to(`user:${member.userId}`).emit('message-notification', {
                    roomId: req.params.roomId,
                    message,
                });
            }
        }

        res.status(201).json({
            success: true,
            data: { message },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/rooms/:roomId/suggest-venue
const suggestVenue = async (req, res, next) => {
    try {
        const membership = await prisma.chatRoomMember.findFirst({
            where: { roomId: req.params.roomId, userId: req.user.id },
        });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }

        console.log(`[SuggestVenue] Request body:`, req.body);
        const { venueId, fieldId, price } = req.body;
        const venue = await prisma.venue.findUnique({
            where: { id: venueId },
            select: { name: true, address: true, images: true }
        });

        console.log(`[SuggestVenue] Found venue: ${venue?.name} (ID: ${venueId})`);

        let venueImage = null;
        if (venue.images) {
            try {
                const imgs = (typeof venue.images === 'string') ? JSON.parse(venue.images) : venue.images;
                if (Array.isArray(imgs) && imgs.length > 0) {
                    const firstImg = imgs[0];
                    if (firstImg && firstImg.startsWith('/')) {
                        const baseUrl = `${req.protocol}://${req.get('host')}`;
                        venueImage = `${baseUrl}${firstImg}`;
                    } else {
                        venueImage = firstImg;
                    }
                }
            } catch (e) {
                console.error("Error parsing venue images:", e);
            }
        }
        console.log(`[SuggestVenue] Resolved Image: ${venueImage}`);

        const contentSnippet = JSON.stringify({
            action: 'VENUE_SUGGEST',
            venueId,
            fieldId,
            price,
            venueName: venue.name,
            address: venue.address,
            venueImage: venueImage || 'https://img.freepik.com/free-vector/stadium-background-design_1284-11883.jpg',
            // Backup fields for compatibility
            image: venueImage,
            venueThumb: venueImage
        });

        const message = await prisma.message.create({
            data: {
                roomId: req.params.roomId,
                senderId: req.user.id,
                content: contentSnippet,
                type: 'SYSTEM',
            },
            include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`room:${req.params.roomId}`).emit('new-message', message);
        }

        res.status(201).json({ success: true, data: { message } });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/messages/:messageId/accept-suggestion
const acceptVenueSuggestion = async (req, res, next) => {
    try {
        const message = await prisma.message.findUnique({
            where: { id: req.params.messageId },
            include: { room: { include: { members: true } } }
        });

        if (!message || message.type !== 'SYSTEM') {
            return res.status(404).json({ success: false, message: 'Suggestion message not found' });
        }

        const isMember = message.room.members.some(m => m.userId === req.user.id);
        if (!isMember) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const suggestionData = JSON.parse(message.content);
        if (suggestionData.action !== 'VENUE_SUGGEST') {
            return res.status(400).json({ success: false, message: 'Not a venue suggestion' });
        }

        // Create a new system message to announce the agreement
        const acceptMessage = await prisma.message.create({
            data: {
                roomId: message.roomId,
                senderId: req.user.id,
                type: 'SYSTEM',
                content: JSON.stringify({
                    action: 'VENUE_ACCEPT',
                    venueId: suggestionData.venueId,
                    venueName: suggestionData.venueName,
                    fieldId: suggestionData.fieldId,
                    price: suggestionData.price,
                    acceptedBy: req.user.fullName
                }),
            },
            include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`room:${message.roomId}`).emit('new-message', acceptMessage);
        }

        res.status(201).json({ success: true, data: { message: acceptMessage } });
    } catch (error) {
        next(error);
    }
};

const getRoomMatchInfo = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        
        // 1. Try finding the SYSTEM message first (fastest)
        const infoMsg = await prisma.message.findFirst({
            where: {
                roomId: roomId,
                type: 'SYSTEM',
                content: { contains: 'MATCH_INIT' }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (infoMsg) {
            try {
                const data = JSON.parse(infoMsg.content);
                return res.json({ success: true, data });
            } catch (e) {
                // Fall through to database lookup if parsing fails
            }
        }

        // 2. Fallback: Find the room members and check MatchRequests
        const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { members: true }
        });

        if (!room || room.type !== 'MATCH_GROUP') {
            return res.status(404).json({ success: false, message: 'Not a match group room' });
        }

        const userIds = room.members.map(m => m.userId);
        if (userIds.length < 2) {
            return res.status(404).json({ success: false, message: 'Room has insufficient members' });
        }

        const matchRequest = await prisma.matchRequest.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { requesterId: userIds[0], post: { userId: userIds[1] } },
                    { requesterId: userIds[1], post: { userId: userIds[0] } }
                ]
            },
            include: { post: true },
            orderBy: { updatedAt: 'desc' }
        });

        if (!matchRequest) {
            return res.status(404).json({ success: false, message: 'Match request not found for these users' });
        }

        const post = matchRequest.post;
        const data = {
            action: 'MATCH_INIT',
            postId: post.id,
            sportType: post.sportType,
            bookingDate: post.bookingDate,
            startTime: post.startTime,
            endTime: post.endTime,
            city: post.city,
            district: post.district
        };

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    getRooms, 
    getMessages, 
    createRoom, 
    sendMessage,
    suggestVenue,
    acceptVenueSuggestion,
    getRoomMatchInfo,
};
