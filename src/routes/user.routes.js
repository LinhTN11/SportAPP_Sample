import express from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { uploadAvatar } from '../middlewares/upload.middleware.js';
import {
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser
} from '../controllers/profile.controller.js';

const router = express.Router();

// Protected routes
router.patch('/profile', protect, uploadAvatar.single('avatar'), updateProfile);

// Admin routes
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.patch('/:id/role', protect, authorize('ADMIN'), updateUserRole);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);

export default router;