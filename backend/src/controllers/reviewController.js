const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/reviews
const createReview = async (req, res, next) => {
    try {
        const { bookingId, rating, comment } = req.body;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { field: true },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.customerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (!['CONFIRMED', 'COMPLETED'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Can only review confirmed/completed bookings' });
        }

        const existing = await prisma.review.findUnique({ where: { bookingId } });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Already reviewed this booking' });
        }

        const review = await prisma.review.create({
            data: {
                userId: req.user.id,
                venueId: booking.field.venueId,
                bookingId,
                rating,
                comment,
            },
            include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
            },
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted',
            data: { review },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/reviews/venue/:venueId
const getVenueReviews = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [reviews, total, avgRating] = await Promise.all([
            prisma.review.findMany({
                where: { venueId: req.params.venueId },
                include: {
                    user: { select: { id: true, fullName: true, avatarUrl: true } },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.review.count({ where: { venueId: req.params.venueId } }),
            prisma.review.aggregate({
                where: { venueId: req.params.venueId },
                _avg: { rating: true },
            }),
        ]);

        res.json({
            success: true,
            data: {
                reviews,
                avgRating: avgRating._avg.rating || 0,
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

// GET /api/reviews/my
const getMyReviews = async (req, res, next) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { userId: req.user.id },
            include: {
                venue: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: { reviews },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createReview, getVenueReviews, getMyReviews };
