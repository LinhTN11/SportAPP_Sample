const { PrismaClient } = require('@prisma/client');

/**
 * Shared Prisma Singleton
 * Prevents multiple connections to the database when using it across different chatbot actions.
 */
const prisma = new PrismaClient({
  log: ['error'], // Keep logs minimal to reduce noise
});

module.exports = prisma;
