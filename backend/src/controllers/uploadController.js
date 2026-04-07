// POST /api/upload
const uploadSingle = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url } });
};

// POST /api/upload/multiple
const uploadMultiple = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ success: true, data: { urls } });
};

module.exports = { uploadSingle, uploadMultiple };
