const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');
const { validate, createMatchPostValidation } = require('../middleware/validate');

// POST /api/matchmaking/posts - Create matchmaking post
router.post('/posts', authenticate, validate(createMatchPostValidation), async (req, res, next) => {
    try {
        const {
            fieldId, bookingDate, startTime, endTime,
            sportType, city, district, description,
            autoMatchEnabled,
        } = req.body;

        // Set expiry to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const post = await prisma.matchmakingPost.create({
            data: {
                userId: req.user.id,
                fieldId,
                bookingDate: new Date(bookingDate),
                startTime,
                endTime,
                sportType,
                city,
                district,
                description,
                autoMatchEnabled: autoMatchEnabled || false,
                expiresAt,
            },
            include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
                field: {
                    include: { venue: { select: { id: true, name: true, address: true } } },
                },
            },
        });

        res.status(201).json({
            success: true,
            message: 'Matchmaking post created',
            data: { post },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/matchmaking/posts - Search matchmaking posts
router.get('/posts', async (req, res, next) => {
    try {
        const { sportType, city, district, date, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            status: 'OPEN',
            expiresAt: { gt: new Date() },
            ...(sportType && { sportType }),
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(district && { district: { contains: district, mode: 'insensitive' } }),
            ...(date && { bookingDate: new Date(date) }),
        };

        const [posts, total] = await Promise.all([
            prisma.matchmakingPost.findMany({
                where,
                include: {
                    user: { select: { id: true, fullName: true, avatarUrl: true } },
                    field: {
                        include: { venue: { select: { id: true, name: true, address: true } } },
                    },
                    _count: { select: { matchRequests: true } },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.matchmakingPost.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/matchmaking/posts/my - My posts
router.get('/posts/my', authenticate, async (req, res, next) => {
    try {
        const posts = await prisma.matchmakingPost.findMany({
            where: { userId: req.user.id },
            include: {
                field: {
                    include: { venue: { select: { id: true, name: true } } },
                },
                matchRequests: {
                    include: {
                        requester: { select: { id: true, fullName: true, avatarUrl: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { posts } });
    } catch (error) {
        next(error);
    }
});

// POST /api/matchmaking/posts/:postId/request - Send match request
router.post('/posts/:postId/request', authenticate, async (req, res, next) => {
    try {
        const post = await prisma.matchmakingPost.findUnique({
            where: { id: req.params.postId },
            include: {
                user: true,
                field: { include: { venue: true } }
            },
        });

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        if (post.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: 'Post is no longer open' });
        }
        if (post.userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot send request to your own post' });
        }

        // Check for existing request
        const existing = await prisma.matchRequest.findFirst({
            where: {
                postId: post.id,
                requesterId: req.user.id,
                status: { in: ['PENDING', 'ACCEPTED'] },
            },
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You already sent a request' });
        }

        const request = await prisma.matchRequest.create({
            data: {
                postId: post.id,
                requesterId: req.user.id,
            },
            include: {
                requester: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        // Notify post owner
        await prisma.notification.create({
            data: {
                userId: post.userId,
                type: 'MATCH_REQUEST',
                title: 'New match request! ⚽',
                body: `${req.user.fullName} wants to join your game on ${post.bookingDate.toISOString().split('T')[0]}`,
                data: { postId: post.id, requestId: request.id },
            },
        });

        // --- In-chat matchmaking notification ---
        // Find existing direct room between requester and post owner
        const existingMemberships = await prisma.chatRoomMember.findMany({
            where: { userId: req.user.id },
            include: {
                room: { include: { members: true } },
            },
        });

        let chatRoom = existingMemberships.find(m =>
            m.room.type === 'DIRECT' &&
            m.room.members.length === 2 &&
            m.room.members.some(mem => mem.userId === post.userId)
        )?.room;

        if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
                data: {
                    type: 'DIRECT',
                    members: {
                        create: [
                            { userId: req.user.id },
                            { userId: post.userId },
                        ],
                    },
                },
            });
        }

        const address = post.field?.venue?.address || `${post.district ? post.district + ', ' : ''}${post.city}`;

        // Send SYSTEM message containing the request details as JSON
        const messageContent = JSON.stringify({
            action: 'MATCH_REQUEST',
            requestId: request.id,
            postId: post.id,
            sportType: post.sportType,
            bookingDate: post.bookingDate.toISOString().split('T')[0],
            startTime: post.startTime,
            endTime: post.endTime,
            address: address,
            note: post.description || 'Không có ghi chú',
            status: 'PENDING'
        });

        const message = await prisma.message.create({
            data: {
                roomId: chatRoom.id,
                senderId: req.user.id, // The requester
                content: messageContent,
                type: 'SYSTEM',
            },
            include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        // Broadcast to chat room
        const io = req.app.get('io');
        if (io) {
            io.to(chatRoom.id).emit('new_message', message);
            // Notify the post owner via their global user room
            io.to(`user:${post.userId}`).emit('message_notification', {
                roomId: chatRoom.id,
                message,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Match request sent',
            data: { request },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/matchmaking/requests/:id/accept - Accept match request
router.post('/requests/:id/accept', authenticate, async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: {
                post: true,
                requester: { select: { id: true, fullName: true } },
            },
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (request.post.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });
        }

        // Accept this request
        await prisma.matchRequest.update({
            where: { id: request.id },
            data: { status: 'ACCEPTED' },
        });

        // Update post status
        await prisma.matchmakingPost.update({
            where: { id: request.postId },
            data: { status: 'MATCHED' },
        });

        // Reject all other pending requests
        await prisma.matchRequest.updateMany({
            where: {
                postId: request.postId,
                id: { not: request.id },
                status: 'PENDING',
            },
            data: { status: 'REJECTED' },
        });

        // Find existing direct room between the two users
        const existingMemberships = await prisma.chatRoomMember.findMany({
            where: { userId: request.post.userId },
            include: {
                room: { include: { members: true } },
            },
        });

        let chatRoom = existingMemberships.find(m =>
            m.room.type === 'DIRECT' &&
            m.room.members.length === 2 &&
            m.room.members.some(mem => mem.userId === request.requesterId)
        )?.room;

        if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
                data: {
                    type: 'DIRECT',
                    members: {
                        create: [
                            { userId: request.post.userId },
                            { userId: request.requesterId },
                        ],
                    },
                },
            });
        }

        // Update SYSTEM message status to ACCEPTED
        const sysMessages = await prisma.message.findMany({
            where: { roomId: chatRoom.id, type: 'SYSTEM' },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        const existingMsg = sysMessages.find(m => {
            try {
                const p = JSON.parse(m.content);
                return p.action === 'MATCH_REQUEST' && p.requestId === request.id;
            } catch (e) { return false; }
        });
        if (existingMsg) {
            try {
                const parsed = JSON.parse(existingMsg.content);
                parsed.status = 'ACCEPTED';
                await prisma.message.update({
                    where: { id: existingMsg.id },
                    data: { content: JSON.stringify(parsed) }
                });
            } catch (e) { }
        }

        // Notify requester
        await prisma.notification.create({
            data: {
                userId: request.requesterId,
                type: 'MATCH_ACCEPTED',
                title: 'Match accepted! 🎉',
                body: `${req.user.fullName} accepted your match request. Start chatting to finalize details!`,
                data: { postId: request.postId, chatRoomId: chatRoom.id },
            },
        });

        res.json({
            success: true,
            message: 'Match request accepted. Chat room created.',
            data: { chatRoomId: chatRoom.id },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/matchmaking/requests/:id/reject - Reject match request
router.post('/requests/:id/reject', authenticate, async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: { post: true },
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (request.post.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await prisma.matchRequest.update({
            where: { id: request.id },
            data: { status: 'REJECTED' },
        });

        // Update SYSTEM message status to REJECTED
        const existingMemberships = await prisma.chatRoomMember.findMany({
            where: { userId: request.post.userId },
            include: { room: { include: { members: true } } },
        });
        const chatRoom = existingMemberships.find(m =>
            m.room.type === 'DIRECT' &&
            m.room.members.length === 2 &&
            m.room.members.some(mem => mem.userId === request.requesterId)
        )?.room;

        if (chatRoom) {
            const sysMessages = await prisma.message.findMany({
                where: { roomId: chatRoom.id, type: 'SYSTEM' },
                orderBy: { createdAt: 'desc' },
                take: 20
            });
            const existingMsg = sysMessages.find(m => {
                try {
                    const p = JSON.parse(m.content);
                    return p.action === 'MATCH_REQUEST' && p.requestId === request.id;
                } catch (e) { return false; }
            });
            if (existingMsg) {
                try {
                    const parsed = JSON.parse(existingMsg.content);
                    parsed.status = 'REJECTED';
                    await prisma.message.update({
                        where: { id: existingMsg.id },
                        data: { content: JSON.stringify(parsed) }
                    });
                } catch (e) { }
            }
        }

        // Notify requester
        await prisma.notification.create({
            data: {
                userId: request.requesterId,
                type: 'MATCH_REJECTED',
                title: 'Match request declined',
                body: `Your match request was declined. Keep searching!`,
                data: { postId: request.postId },
            },
        });

        res.json({ success: true, message: 'Match request rejected' });
    } catch (error) {
        next(error);
    }
});

// POST /api/matchmaking/requests/:id/cancel - Cancel auto-matched (or own request)
router.post('/requests/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: {
                post: { include: { user: true } },
                requester: true,
            },
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const isPostOwner = request.post.userId === req.user.id;
        const isRequester = request.requesterId === req.user.id;

        if (!isPostOwner && !isRequester) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!['ACCEPTED', 'AUTO_MATCHED'].includes(request.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel this request' });
        }

        // Cancel the request
        await prisma.matchRequest.update({
            where: { id: request.id },
            data: { status: 'CANCELLED' },
        });

        // Reopen the post
        await prisma.matchmakingPost.update({
            where: { id: request.postId },
            data: { status: 'OPEN' },
        });

        // Notify the other party
        const notifyUserId = isPostOwner ? request.requesterId : request.post.userId;
        await prisma.notification.create({
            data: {
                userId: notifyUserId,
                type: 'MATCH_CANCELLED',
                title: 'Match cancelled',
                body: `The match for ${request.post.sportType} on ${request.post.bookingDate.toISOString().split('T')[0]} has been cancelled. The post is now open again for matching.`,
                data: { postId: request.postId },
            },
        });

        res.json({ success: true, message: 'Match cancelled. Post reopened.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
