const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middlewares/auth');

const {
    getProfile,
    updateProfile,
    adminListUsers,
} = require('../controllers/user.controller');

// GET /api/users/profile
router.get('/profile', authenticate, getProfile);

// PUT /api/users/profile
router.put('/profile', authenticate, updateProfile);

// GET /api/users (Admin only) - List all users
router.get('/', authenticate, authorize('ADMIN'), adminListUsers);

module.exports = router;
