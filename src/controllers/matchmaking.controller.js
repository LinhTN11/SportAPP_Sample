const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createPost = async (req, res, next) => {
    try {
        const {
            fieldId, bookingDate, startTime, endTime,
            sportType, city, district, description,
            autoMatchEnabled,
        } = req.body;

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
                field: { include: { venue: { select: { id: true, name: true, address: true } } } },
            },
        });

        res.status(201).json({ success: true, message: 'Matchmaking post created', data: { post } });
    } catch (error) {
        next(error);
    }
};

const searchPosts = async (req, res, next) => {
    try {
        const { sportType, city, district, date, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

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
                    field: { include: { venue: { select: { id: true, name: true, address: true } } } },
                    _count: { select: { matchRequests: true } },
                },
                skip,
                take: parseInt(limit, 10),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.matchmakingPost.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                posts,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit, 10)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const myPosts = async (req, res, next) => {
    try {
        const posts = await prisma.matchmakingPost.findMany({
            where: { userId: req.user.id },
            include: {
                field: { include: { venue: { select: { id: true, name: true } } } },
                matchRequests: { include: { requester: { select: { id: true, fullName: true, avatarUrl: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { posts } });
    } catch (error) {
        next(error);
    }
};

const requestMatch = async (req, res, next) => {
    try {
        const post = await prisma.matchmakingPost.findUnique({
            where: { id: req.params.postId },
            include: { user: true },
        });

        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        if (post.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Post is no longer open' });
        if (post.userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot send request to your own post' });
        }

        const existing = await prisma.matchRequest.findFirst({
            where: {
                postId: post.id,
                requesterId: req.user.id,
                status: { in: ['PENDING', 'ACCEPTED'] },
            },
        });
        if (existing) return res.status(409).json({ success: false, message: 'You already sent a request' });

        const request = await prisma.matchRequest.create({
            data: { postId: post.id, requesterId: req.user.id },
            include: { requester: { select: { id: true, fullName: true, avatarUrl: true } } },
        });

        await prisma.notification.create({
            data: {
                userId: post.userId,
                type: 'MATCH_REQUEST',
                title: 'New match request! ⚽',
                body: `${req.user.fullName} wants to join your game on ${post.bookingDate.toISOString().split('T')[0]}`,
                data: { postId: post.id, requestId: request.id },
            },
        });

        res.status(201).json({ success: true, message: 'Match request sent', data: { request } });
    } catch (error) {
        next(error);
    }
};

const acceptRequest = async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: { post: true, requester: { select: { id: true, fullName: true } } },
        });

        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.post.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
        if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request is no longer pending' });

        await prisma.matchRequest.update({ where: { id: request.id }, data: { status: 'ACCEPTED' } });
        await prisma.matchmakingPost.update({ where: { id: request.postId }, data: { status: 'MATCHED' } });
        await prisma.matchRequest.updateMany({
            where: { postId: request.postId, id: { not: request.id }, status: 'PENDING' },
            data: { status: 'REJECTED' },
        });

        const chatRoom = await prisma.chatRoom.create({
            data: {
                type: 'MATCH_GROUP',
                name: `Match: ${request.post.sportType} - ${request.post.bookingDate.toISOString().split('T')[0]}`,
                members: { create: [{ userId: request.post.userId }, { userId: request.requesterId }] },
            },
        });

        await prisma.notification.create({
            data: {
                userId: request.requesterId,
                type: 'MATCH_ACCEPTED',
                title: 'Match accepted! 🎉',
                body: `${req.user.fullName} accepted your match request. Start chatting to finalize details!`,
                data: { postId: request.postId, chatRoomId: chatRoom.id },
            },
        });

        res.json({ success: true, message: 'Match request accepted. Chat room created.', data: { chatRoomId: chatRoom.id } });
    } catch (error) {
        next(error);
    }
};

const rejectRequest = async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: { post: true },
        });

        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.post.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });

        await prisma.matchRequest.update({ where: { id: request.id }, data: { status: 'REJECTED' } });

        await prisma.notification.create({
            data: {
                userId: request.requesterId,
                type: 'MATCH_REJECTED',
                title: 'Match request declined',
                body: 'Your match request was declined. Keep searching!',
                data: { postId: request.postId },
            },
        });

        res.json({ success: true, message: 'Match request rejected' });
    } catch (error) {
        next(error);
    }
};

const cancelRequest = async (req, res, next) => {
    try {
        const request = await prisma.matchRequest.findUnique({
            where: { id: req.params.id },
            include: { post: { include: { user: true } }, requester: true },
        });

        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        const isPostOwner = request.post.userId === req.user.id;
        const isRequester = request.requesterId === req.user.id;
        if (!isPostOwner && !isRequester) return res.status(403).json({ success: false, message: 'Access denied' });

        if (!['ACCEPTED', 'AUTO_MATCHED'].includes(request.status)) {
            return res.status(400).json({ success: false, message: 'Cannot cancel this request' });
        }

        await prisma.matchRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED' } });
        await prisma.matchmakingPost.update({ where: { id: request.postId }, data: { status: 'OPEN' } });

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
};

module.exports = {
    createPost,
    searchPosts,
    myPosts,
    requestMatch,
    acceptRequest,
    rejectRequest,
    cancelRequest,
};
