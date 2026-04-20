const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { authenticate, authorize } = require('../middleware/auth');

// All tax routes require authentication
router.use(authenticate);

// Owner routes
router.get('/vouchers', authorize('OWNER', 'ADMIN'), taxController.getVouchers);
router.get('/vouchers/:id/export', authorize('OWNER', 'ADMIN'), taxController.exportVoucher);

// Admin only routes
router.get('/admin/vouchers', authorize('ADMIN'), taxController.getAllVouchers);
router.post('/generate', authorize('ADMIN'), taxController.generateMonthlyVouchers);

module.exports = router;
