const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const listNotifications = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const where = {
            userId: req.user.id,
            ...(unreadOnly === 'true' && { isRead: false }),
        };

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take: parseInt(limit, 10),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
        ]);

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
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

const markRead = async (req, res, next) => {
    try {
        await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};

const markReadAll = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true, message: 'All marked as read' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listNotifications,
    markRead,
    markReadAll,
};
