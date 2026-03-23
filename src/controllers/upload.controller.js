const multer = require('multer');
const path = require('path');

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

const uploadSingle = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) return next(err);
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = `/uploads/${req.file.filename}`;
        res.json({ success: true, data: { url } });
    });
};

const uploadMultiple = (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) return next(err);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        const urls = req.files.map((f) => `/uploads/${f.filename}`);
        res.json({ success: true, data: { urls } });
    });
};

module.exports = {
    uploadSingle,
    uploadMultiple,
};
