const router = require('express').Router();
const { validate, registerValidation, loginValidation } = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const {
    register,
    login,
    me,
} = require('../controllers/auth.controller');

// POST /api/auth/register
router.post('/register', validate(registerValidation), register);

// POST /api/auth/login
router.post('/login', validate(loginValidation), login);

// GET /api/auth/me - Get current user
router.get('/me', authenticate, me);

module.exports = router;
