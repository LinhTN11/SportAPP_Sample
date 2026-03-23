const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');

const {
    uploadSingle,
    uploadMultiple,
} = require('../controllers/upload.controller');

// POST /api/upload - Upload single image
router.post('/', authenticate, uploadSingle);

// POST /api/upload/multiple - Upload multiple images (max 10)
router.post('/multiple', authenticate, uploadMultiple);

module.exports = router;
