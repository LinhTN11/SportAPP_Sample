const { Queue, Worker, RedisConnection } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

/**
 * Custom Queue for SportApp jobs
 */
const jobQueue = new Queue('sportapp-jobs', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

module.exports = {
    jobQueue,
    connection,
};
