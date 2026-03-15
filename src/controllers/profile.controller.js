import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Update profile
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    const userId = req.user.id;

    // Check if email is being changed
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          status: 'error',
          message: 'Email đã được sử dụng bởi người dùng khác'
        });
      }
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;

    // Handle avatar upload
    if (req.file) {
      // Get current user to delete old avatar
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (currentUser && currentUser.avatar) {
        try {
          fs.unlinkSync(currentUser.avatar);
        } catch (err) {
          console.log('Failed to delete old avatar:', err);
        }
      }
      updateData.avatar = req.file.path;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật profile thành công',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (ADMIN only)
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    });

    res.json({
      status: 'success',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (ADMIN only)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Người dùng không tồn tại'
      });
    }

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (ADMIN only)
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['CUSTOMER', 'OWNER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: `Role phải là một trong: ${validRoles.join(', ')}`
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật vai trò thành công',
      data: updatedUser
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Người dùng không tồn tại'
      });
    }
    next(error);
  }
};

// Delete user (ADMIN only)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Người dùng không tồn tại'
      });
    }

    // Delete avatar if exists
    if (user.avatar) {
      try {
        fs.unlinkSync(user.avatar);
      } catch (err) {
        console.log('Failed to delete avatar:', err);
      }
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });

    res.json({
      status: 'success',
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    next(error);
  }
};
