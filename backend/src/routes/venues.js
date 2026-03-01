const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createVenueValidation } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// POST /api/venues - Owner creates a venue
router.post('/', authenticate, authorize('OWNER'), validate(createVenueValidation), async (req, res, next) => {
    try {
        const {
            name, phone, address, city, district,
            latitude, longitude, sportTypes,
            description, images, openTime, closeTime,
            holdDurationMinutes,
        } = req.body;

        const venue = await prisma.venue.create({
            data: {
                ownerId: req.user.id,
                name,
                phone,
                address,
                city,
                district,
                latitude,
                longitude,
                sportTypes: sportTypes || [],
                description,
                images: images || [],
                openTime,
                closeTime,
                holdDurationMinutes: holdDurationMinutes || parseInt(process.env.DEFAULT_HOLD_DURATION_MINUTES) || 10,
            },
        });

        // Notify admins about new venue pending approval
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'VENUE_APPROVED', // Using as "VENUE_PENDING" notification
                    title: 'New venue pending approval',
                    body: `${req.user.fullName} submitted "${name}" for approval`,
                    data: { venueId: venue.id },
                },
            });
        }

        res.status(201).json({
            success: true,
            message: 'Venue created and pending admin approval',
            data: { venue },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/venues - List venues (public)
router.get('/', async (req, res, next) => {
    try {
        const { city, district, sportType, status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            status: status || 'APPROVED',
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(district && { district: { contains: district, mode: 'insensitive' } }),
        };

        // Filter by sport type in JSON array
        if (sportType) {
            where.sportTypes = { array_contains: [sportType] };
        }

        const [venues, total] = await Promise.all([
            prisma.venue.findMany({
                where,
                include: {
                    owner: {
                        select: { id: true, fullName: true, phone: true },
                    },
                    fields: { where: { isActive: true } },
                    _count: { select: { reviews: true } },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.venue.count({ where }),
        ]);

        // Calculate average rating for each venue
        const venuesWithRating = await Promise.all(
            venues.map(async (venue) => {
                const avgRating = await prisma.review.aggregate({
                    where: { venueId: venue.id },
                    _avg: { rating: true },
                });
                return {
                    ...venue,
                    avgRating: avgRating._avg.rating || 0,
                    reviewCount: venue._count.reviews,
                };
            })
        );

        res.json({
            success: true,
            data: {
                venues: venuesWithRating,
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

// GET /api/venues/:id - Get venue details
router.get('/:id', async (req, res, next) => {
    try {
        const venue = await prisma.venue.findUnique({
            where: { id: req.params.id },
            include: {
                owner: {
                    select: { id: true, fullName: true, phone: true, avatarUrl: true },
                },
                fields: {
                    where: { isActive: true },
                    include: {
                        pricingRules: { where: { isActive: true } },
                        parentComposites: { include: { childField: true } },
                        childComposites: { include: { parentField: true } },
                    },
                },
                reviews: {
                    include: {
                        user: { select: { id: true, fullName: true, avatarUrl: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }

        // Average rating
        const avgRating = await prisma.review.aggregate({
            where: { venueId: venue.id },
            _avg: { rating: true },
            _count: true,
        });

        res.json({
            success: true,
            data: {
                venue: {
                    ...venue,
                    avgRating: avgRating._avg.rating || 0,
                    reviewCount: avgRating._count,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/venues/:id - Owner updates venue
router.put('/:id', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const venue = await prisma.venue.findUnique({ where: { id: req.params.id } });
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        if (venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const {
            name, phone, address, city, district,
            latitude, longitude, sportTypes,
            description, images, openTime, closeTime,
            holdDurationMinutes,
        } = req.body;

        const updated = await prisma.venue.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(phone !== undefined && { phone }),
                ...(address && { address }),
                ...(city && { city }),
                ...(district && { district }),
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
                ...(sportTypes && { sportTypes }),
                ...(description !== undefined && { description }),
                ...(images && { images }),
                ...(openTime && { openTime }),
                ...(closeTime && { closeTime }),
                ...(holdDurationMinutes && { holdDurationMinutes }),
            },
        });

        res.json({
            success: true,
            message: 'Venue updated',
            data: { venue: updated },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/venues/owner/my-venues - Owner's venues
router.get('/owner/my-venues', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const venues = await prisma.venue.findMany({
            where: { ownerId: req.user.id },
            include: {
                fields: {
                    include: {
                        pricingRules: { where: { isActive: true } },
                    },
                },
                _count: { select: { reviews: true, fields: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: { venues } });
    } catch (error) {
        next(error);
    }
});

// POST /api/venues/:id/approve - Admin approves venue
router.post('/:id/approve', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const venue = await prisma.venue.findUnique({ where: { id: req.params.id } });
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        if (venue.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Venue is not pending approval' });
        }

        // Generate unique booking URL
        const bookingSlug = `${venue.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().slice(0, 8)}`;
        const bookingUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/book/${bookingSlug}`;

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(bookingUrl, {
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
        });

        const updated = await prisma.venue.update({
            where: { id: req.params.id },
            data: {
                status: 'APPROVED',
                bookingUrl,
                qrCodeUrl,
            },
        });

        // Notify owner
        await prisma.notification.create({
            data: {
                userId: venue.ownerId,
                type: 'VENUE_APPROVED',
                title: 'Venue approved! 🎉',
                body: `Your venue "${venue.name}" has been approved. You can now add fields and pricing.`,
                data: { venueId: venue.id },
            },
        });

        res.json({
            success: true,
            message: 'Venue approved',
            data: { venue: updated },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/venues/:id/reject - Admin rejects venue
router.post('/:id/reject', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { reason } = req.body;
        const venue = await prisma.venue.findUnique({ where: { id: req.params.id } });
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }

        const updated = await prisma.venue.update({
            where: { id: req.params.id },
            data: { status: 'REJECTED' },
        });

        // Notify owner
        await prisma.notification.create({
            data: {
                userId: venue.ownerId,
                type: 'VENUE_REJECTED',
                title: 'Venue rejected',
                body: `Your venue "${venue.name}" has been rejected. Reason: ${reason || 'Not specified'}`,
                data: { venueId: venue.id },
            },
        });

        res.json({
            success: true,
            message: 'Venue rejected',
            data: { venue: updated },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/venues/admin/pending - Admin list pending venues
router.get('/admin/pending', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const venues = await prisma.venue.findMany({
            where: { status: 'PENDING' },
            include: {
                owner: {
                    select: { id: true, fullName: true, email: true, phone: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, data: { venues } });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
