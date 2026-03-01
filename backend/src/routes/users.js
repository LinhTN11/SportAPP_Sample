const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                role: true,
                isVerified: true,
                preferredLanguage: true,
                createdAt: true,
            },
        });

        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { fullName, phone, avatarUrl, preferredLanguage } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(fullName && { fullName }),
                ...(phone && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(preferredLanguage && { preferredLanguage }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                role: true,
                isVerified: true,
                preferredLanguage: true,
            },
        });

        res.json({
            success: true,
            message: 'Profile updated',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/users (Admin only) - List all users
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = role ? { role } : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatarUrl: true,
                    role: true,
                    isVerified: true,
                    createdAt: true,
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                users,
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

module.exports = router;
