const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/matchmaking/posts
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
};

// GET /api/matchmaking/posts
const searchPosts = async (req, res, next) => {
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
};

// GET /api/matchmaking/posts/my
const getMyPosts = async (req, res, next) => {
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
};

// POST /api/matchmaking/posts/:postId/request
const sendRequest = async (req, res, next) => {
    try {
        const post = await prisma.matchmakingPost.findUnique({
            where: { id: req.params.postId },
            include: { user: true },
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

        await prisma.notification.create({
            data: {
                userId: post.userId,
                type: 'MATCH_REQUEST',
                title: 'New match request! ⚽',
                body: `${req.user.fullName} wants to join your game on ${post.bookingDate.toISOString().split('T')[0]}`,
                data: { postId: post.id, requestId: request.id },
            },
        });

        res.status(201).json({
            success: true,
            message: 'Match request sent',
            data: { request },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/matchmaking/requests/:id/accept
const acceptRequest = async (req, res, next) => {
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

        await prisma.matchRequest.update({
            where: { id: request.id },
            data: { status: 'ACCEPTED' },
        });

        await prisma.matchmakingPost.update({
            where: { id: request.postId },
            data: { status: 'MATCHED' },
        });

        await prisma.matchRequest.updateMany({
            where: {
                postId: request.postId,
                id: { not: request.id },
                status: 'PENDING',
            },
            data: { status: 'REJECTED' },
        });

        // Always create a dedicated MATCH_GROUP room for each accepted match
        // to avoid mixing match conversations with existing DIRECT rooms.
        const requesterId = request.requesterId;
        const ownerId = request.post.userId;

        const chatRoom = await prisma.chatRoom.create({
            data: {
                type: 'MATCH_GROUP',
                name: `Match: ${request.post.sportType} - ${request.post.bookingDate.toISOString().split('T')[0]}`,
                members: {
                    create: [
                        { userId: ownerId },
                        { userId: requesterId },
                    ],
                },
            },
        });
        console.log(`[MatchAccept] Created dedicated match chat room: ${chatRoom.id}`);

        // Add a system message to link the match post and provide initial context
        await prisma.message.create({
            data: {
                roomId: chatRoom.id,
                senderId: request.post.userId, 
                type: 'SYSTEM',
                content: JSON.stringify({
                    action: 'MATCH_INIT',
                    postId: request.postId,
                    sportType: request.post.sportType,
                    bookingDate: request.post.bookingDate,
                    startTime: request.post.startTime,
                    endTime: request.post.endTime,
                    city: request.post.city,
                    district: request.post.district
                }),
            }
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

        res.json({
            success: true,
            message: 'Match request accepted. Chat room created.',
            data: { chatRoomId: chatRoom.id },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/matchmaking/requests/:id/reject
const rejectRequest = async (req, res, next) => {
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
};

// POST /api/matchmaking/requests/:id/cancel
const cancelRequest = async (req, res, next) => {
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

        await prisma.matchRequest.update({
            where: { id: request.id },
            data: { status: 'CANCELLED' },
        });

        await prisma.matchmakingPost.update({
            where: { id: request.postId },
            data: { status: 'OPEN' },
        });

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

// GET /api/matchmaking/posts/:id/suggested-venues
const getSuggestedVenues = async (req, res, next) => {
    try {
        console.log(`[SuggestedVenues] Fetching for post ID: ${req.params.id}`);
        const post = await prisma.matchmakingPost.findUnique({
            where: { id: req.params.id }
        });

        if (!post) {
            console.log(`[SuggestedVenues] Post not found: ${req.params.id}`);
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        console.log(`[SuggestedVenues] Match Post criteria: ${post.sportType} in ${post.city}, ${post.district}`);

        const where = {
            status: 'APPROVED',
            city: { contains: post.city, mode: 'insensitive' }
        };

        // Fetch candidates first
        const allVenues = await prisma.venue.findMany({
            where,
            include: {
                fields: {
                    where: { isActive: true }, // Get ALL active fields for fallback pricing
                    include: { pricingRules: { where: { isActive: true } } }
                },
                _count: { select: { reviews: true } }
            }
        });

        console.log(`[SuggestedVenues] Candidate venues in ${post.city}: ${allVenues.length}`);

        // Filter by sportType in JavaScript to avoid Prisma Json operator issues
        const filteredVenues = allVenues.filter(v => {
            try {
                const types = Array.isArray(v.sportTypes) ? v.sportTypes : JSON.parse(v.sportTypes || '[]');
                return types.includes(post.sportType);
            } catch (e) {
                return false;
            }
        }).slice(0, 10);

        console.log(`[SuggestedVenues] Filtered venues for ${post.sportType}: ${filteredVenues.length}`);

        const venuesWithMetrics = await Promise.all(
            filteredVenues.map(async (venue) => {
                try {
                    const avgResult = await prisma.review.aggregate({
                        where: { venueId: venue.id },
                        _avg: { rating: true }
                    });
                    
                    const avgRating = avgResult._avg.rating ? Number(avgResult._avg.rating) : 0;
                    
                    // Calculate prices - try sport-specific fields first, then any field
                    let pricingFields = (venue.fields || []).filter(f => f.sportType === post.sportType);
                    if (pricingFields.length === 0) pricingFields = venue.fields || [];

                    const prices = pricingFields
                        .flatMap(f => f.pricingRules || [])
                        .map(r => Number(r.price))
                        .filter(p => !isNaN(p) && p > 0);

                    // Ensure images is an array and prefix with backend URL if relative
                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    let images = venue.images;
                    if (typeof images === 'string') {
                        try { images = JSON.parse(images); } catch(e) { images = []; }
                    }
                    if (!Array.isArray(images)) images = [];

                    const absoluteImages = images.map(img => {
                        if (img && img.startsWith('/')) return `${baseUrl}${img}`;
                        return img;
                    });

                    return {
                        ...venue,
                        images: absoluteImages.length > 0 ? absoluteImages : ['https://img.freepik.com/free-vector/stadium-background-design_1284-11883.jpg'], 
                        avgRating: Math.round(avgRating * 10) / 10,
                        minPrice: prices.length > 0 ? Math.min(...prices) : null
                    };
                } catch (e) {
                    return { 
                        ...venue, 
                        images: ['https://img.freepik.com/free-vector/stadium-background-design_1284-11883.jpg'],
                        avgRating: 0, 
                        minPrice: null 
                    };
                }
            })
        );

        res.json({ success: true, data: { venues: venuesWithMetrics } });
    } catch (error) {
        console.error(`[SuggestedVenues] CRITICAL ERROR:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error while fetching venues',
            error: error.message 
        });
    }
};

module.exports = {
    createPost,
    searchPosts,
    getMyPosts,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    getSuggestedVenues,
};
