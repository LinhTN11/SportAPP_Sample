const { Queue, Worker, RedisConnection } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;
const redisEnabled = process.env.REDIS_ENABLED === 'true';

let connection = null;
let jobQueue = null;

if (redisEnabled && redisUrl) {
    connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: () => null,
        reconnectOnError: () => false,
    });

    connection.on('error', (err) => {
        console.warn('[BullMQ] Redis unavailable, queue features are disabled:', err.message || err);
    });

    /**
     * Custom Queue for SportApp jobs
     */
    jobQueue = new Queue('sportapp-jobs', {
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
} else {
    if (redisUrl && !redisEnabled) {
        console.warn('[BullMQ] Redis queue disabled. Set REDIS_ENABLED=true to enable distributed jobs.');
    } else {
        console.warn('[BullMQ] REDIS_URL is not set, distributed jobs are disabled.');
    }
}

module.exports = {
    jobQueue,
    connection,
};
