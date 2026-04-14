const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const venueRoutes = require('./routes/venues');
const fieldRoutes = require('./routes/fields');
const bookingRoutes = require('./routes/bookings');
const matchmakingRoutes = require('./routes/matchmaking');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const chatbotRoutes = require('./routes/chatbot');
const adminRoutes = require('./routes/admin');

// Import socket handler
const { setupSocket } = require('./socket/chatSocket');

// Import cron jobs
const { startCronJobs } = require('./jobs/cronJobs');

const app = express();
const server = http.createServer(app);
const redisEnabled = process.env.REDIS_ENABLED === 'true';

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = new Set([...defaultDevOrigins, ...configuredOrigins]);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);
};

const corsOriginDelegate = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked for origin: ${origin}`));
};

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Redis Adapter Setup (opt-in via REDIS_ENABLED=true)
if (redisEnabled && process.env.REDIS_URL) {
  const pubClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      // Prevent endless ECONNREFUSED spam when Redis is down in local dev.
      reconnectStrategy: () => false,
    },
  });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔄 Socket.io Redis adapter connected');
  }).catch(err => {
    console.warn('⚠️ Socket.io Redis adapter unavailable, running without Redis adapter:', err.message || err);
  });
} else if (process.env.REDIS_URL && !redisEnabled) {
  console.warn('ℹ️ Redis adapter disabled. Set REDIS_ENABLED=true to enable Socket.io Redis adapter.');
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: corsOriginDelegate,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make prisma and io available to routes
app.set('prisma', prisma);
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Setup socket
setupSocket(io, prisma);

// Start cron jobs
startCronJobs(prisma);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SportApp API running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

module.exports = { app, server, prisma };
