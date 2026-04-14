const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getUsers,
    updateUserRole,
    deleteUser,
} = require('../controllers/adminController');

// All routes here are for ADMIN only
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/charts', getChartData);
router.get('/activity', getRecentActivity);

// User management
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
