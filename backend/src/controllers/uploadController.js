// POST /api/upload
const uploadSingle = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // multer-storage-cloudinary provides the URL in req.file.path
    const url = req.file.path;
    res.json({ success: true, data: { url } });
};

// POST /api/upload/multiple
const uploadMultiple = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map(f => f.path);
    res.json({ success: true, data: { urls } });
};

module.exports = { uploadSingle, uploadMultiple };
