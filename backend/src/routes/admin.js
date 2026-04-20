const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getUsers,
    updateUserRole,
    updateUserTaxInfo,
    deleteUser,
    getPlatformSettings,
    updatePlatformSettings,
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
router.patch('/users/:id/tax-info', updateUserTaxInfo);
router.delete('/users/:id', deleteUser);

// Platform settings
router.get('/settings/platform', getPlatformSettings);
router.patch('/settings/platform', updatePlatformSettings);

module.exports = router;
