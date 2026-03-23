const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                coverImageUrl: true,
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
};

const updateProfile = async (req, res, next) => {
    try {
        const { fullName, phone, avatarUrl, coverImageUrl, preferredLanguage } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(coverImageUrl !== undefined && { coverImageUrl }),
                ...(preferredLanguage !== undefined && { preferredLanguage }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                coverImageUrl: true,
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
};

const adminListUsers = async (req, res, next) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

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
                take: parseInt(limit, 10),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                users,
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

module.exports = {
    getProfile,
    updateProfile,
    adminListUsers,
};
