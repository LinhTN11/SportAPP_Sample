const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../controllers/uploadController');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isValid = file.mimetype.startsWith('image/');
        cb(isValid ? null : new Error('Only image files are allowed'), isValid);
    },
});

router.post('/', authenticate, upload.single('image'), uploadSingle);
router.post('/multiple', authenticate, upload.array('images', 10), uploadMultiple);

module.exports = router;
