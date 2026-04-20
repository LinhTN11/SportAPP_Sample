const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getProfile, updateProfile, listUsers, getPublicProfile, getAdminContact } = require('../controllers/userController');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/admin-contact', authenticate, getAdminContact); // For support chat
router.get('/:id/public', getPublicProfile);
router.get('/', authenticate, authorize('ADMIN'), listUsers);

module.exports = router;
