const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/users/profile
const getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                taxCode: true,
                address: true,
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

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
    try {
        const { fullName, phone, taxCode, address, avatarUrl, coverImageUrl, preferredLanguage } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(fullName && { fullName }),
                ...(phone && { phone }),
                ...(taxCode !== undefined && { taxCode }),
                ...(address !== undefined && { address }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(coverImageUrl !== undefined && { coverImageUrl }),
                ...(preferredLanguage && { preferredLanguage }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                taxCode: true,
                address: true,
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

// GET /api/users (Admin only)
const listUsers = async (req, res, next) => {
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
};

// GET /api/users/:id/public
const getPublicProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                coverImageUrl: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/admin-contact
// Returns the first ADMIN user for support chat
const getAdminContact = async (req, res, next) => {
    try {
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true, fullName: true, avatarUrl: true, email: true },
        });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy admin' });
        }
        res.json({ success: true, data: { admin } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile, listUsers, getPublicProfile, getAdminContact };
