const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../controllers/uploadController');

const { storage } = require('../config/cloudinary');

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', authenticate, upload.single('image'), uploadSingle);
router.post('/multiple', authenticate, upload.array('images', 10), uploadMultiple);

module.exports = router;
