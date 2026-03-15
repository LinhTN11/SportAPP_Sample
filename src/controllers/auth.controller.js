import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/jwt.js';

const prisma = new PrismaClient();

// Validation helper
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Register
export const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        status: 'error',
        message: "Email, mật khẩu và họ tên là bắt buộc" 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        status: 'error',
        message: "Email không hợp lệ" 
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        status: 'error',
        message: "Mật khẩu phải từ 6 ký tự trở lên" 
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        status: 'error',
        message: "Email đã được đăng ký" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash: hashedPassword, 
        fullName,
        role: 'CUSTOMER' 
      }
    });

    res.status(201).json({ 
      status: 'success',
      message: "Đăng ký thành công",
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: "Email và mật khẩu là bắt buộc" 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: "Email hoặc mật khẩu sai" 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        status: 'error',
        message: "Email hoặc mật khẩu sai" 
      });
    }

    // Generate token
    const token = generateToken({ id: user.id, role: user.role, email: user.email });
    
    res.json({ 
      status: 'success',
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        message: "Người dùng không tồn tại" 
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