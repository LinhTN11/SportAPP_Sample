const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getProfile, updateProfile, listUsers } = require('../controllers/userController');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/', authenticate, authorize('ADMIN'), listUsers);

module.exports = router;
