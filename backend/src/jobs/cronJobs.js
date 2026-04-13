const { Worker } = require('bullmq');
const { jobQueue, connection } = require('./queue');

/**
 * Start all distributed cron jobs using BullMQ
 */
function startCronJobs(prisma) {
    console.log('⏰ Distributed Cron jobs (BullMQ) started');

    // 1. Define the Worker to handle jobs
    const worker = new Worker('sportapp-jobs', async job => {
        const { name } = job;

        try {
            switch (name) {
                case 'expire-holds':
                    return await handleExpireHolds(prisma);
                case 'auto-match':
                    return await handleAutoMatch(prisma);
                case 'expire-posts':
                    return await handleExpirePosts(prisma);
                case 'auto-complete-bookings':
                    return await handleAutoCompleteBookings(prisma);
                default:
                    console.warn(`Unknown job name: ${name}`);
            }
        } catch (err) {
            console.error(`Error processing job ${name}:`, err);
            throw err;
        }
    }, { connection });

    worker.on('failed', (job, err) => {
        console.error(`❌ Job failed: ${job.name} (${job.id}) - ${err.message}`);
    });

    // 2. Schedule repeatable jobs
    setupSchedules();
}

/**
 * Setup job schedules (idempotent - will update if already exists)
 */
async function setupSchedules() {
    // Job 1: Expire booking holds (every minute)
    await jobQueue.add('expire-holds', {}, {
        repeat: { pattern: '* * * * *' },
        jobId: 'expire-holds-job'
    });

    // Job 2: Auto-match matchmaking posts (every 5 minutes)
    await jobQueue.add('auto-match', {}, {
        repeat: { pattern: '*/5 * * * *' },
        jobId: 'auto-match-job'
    });

    // Job 3: Expire old matchmaking posts (every hour)
    await jobQueue.add('expire-posts', {}, {
        repeat: { pattern: '0 * * * *' },
        jobId: 'expire-posts-job'
    });

    // Job 4: Auto-complete confirmed bookings (every minute)
    await jobQueue.add('auto-complete-bookings', {}, {
        repeat: { pattern: '* * * * *' },
        jobId: 'auto-complete-job'
    });
}

/**
 * Job Handlers
 */

async function handleExpireHolds(prisma) {
    const expired = await prisma.booking.updateMany({
        where: {
            status: 'PENDING_DEPOSIT',
            holdExpiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
    });

    if (expired.count > 0) {
        console.log(`🔄 [Worker] Expired ${expired.count} booking holds`);
    }
    return { expired: expired.count };
}

async function handleAutoMatch(prisma) {
    // Find all OPEN posts with auto_match_enabled
    const posts = await prisma.matchmakingPost.findMany({
        where: {
            status: 'OPEN',
            autoMatchEnabled: true,
            expiresAt: { gt: new Date() },
        },
        include: {
            user: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    if (posts.length < 2) return { matched: 0 };

    const matched = new Set();
    let matchCount = 0;

    for (let i = 0; i < posts.length; i++) {
        if (matched.has(posts[i].id)) continue;

        for (let j = i + 1; j < posts.length; j++) {
            if (matched.has(posts[j].id)) continue;

            const a = posts[i];
            const b = posts[j];

            const sameConditions =
                a.sportType === b.sportType &&
                a.bookingDate.toISOString() === b.bookingDate.toISOString() &&
                a.city.toLowerCase() === b.city.toLowerCase() &&
                a.startTime === b.startTime &&
                a.endTime === b.endTime &&
                a.userId !== b.userId;

            if (sameConditions) {
                // Create auto-match request
                const request = await prisma.matchRequest.create({
                    data: {
                        postId: a.id,
                        requesterId: b.userId,
                        status: 'AUTO_MATCHED',
                    },
                });

                // Update both posts
                await prisma.matchmakingPost.updateMany({
                    where: { id: { in: [a.id, b.id] } },
                    data: { status: 'MATCHED' },
                });

                // Create chat room
                const chatRoom = await prisma.chatRoom.create({
                    data: {
                        type: 'MATCH_GROUP',
                        name: `Auto-match: ${a.sportType} - ${a.bookingDate.toISOString().split('T')[0]}`,
                        members: {
                            create: [
                                { userId: a.userId },
                                { userId: b.userId },
                            ],
                        },
                    },
                });

                // Notify both users
                const dateStr = a.bookingDate.toISOString().split('T')[0];
                for (const userId of [a.userId, b.userId]) {
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'MATCH_AUTO',
                            title: 'Auto-match found! 🎯',
                            body: `System found a match for you: ${a.sportType} on ${dateStr} (${a.startTime}-${a.endTime}). Chat with your opponent now!`,
                            data: { postId: a.id, requestId: request.id, chatRoomId: chatRoom.id },
                        },
                    });
                }

                matched.add(a.id);
                matched.add(b.id);
                matchCount++;
                break;
            }
        }
    }

    if (matchCount > 0) {
        console.log(`🤝 [Worker] Auto-matched ${matchCount} pairs`);
    }
    return { matched: matchCount };
}

async function handleExpirePosts(prisma) {
    const expired = await prisma.matchmakingPost.updateMany({
        where: {
            status: 'OPEN',
            expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
    });

    if (expired.count > 0) {
        console.log(`🔄 [Worker] Expired ${expired.count} matchmaking posts`);
    }
    return { expired: expired.count };
}

async function handleAutoCompleteBookings(prisma) {
    const now = new Date();
    const confirmedBookings = await prisma.booking.findMany({
        where: {
            status: 'CONFIRMED',
            bookingDate: { lte: now },
        },
        select: {
            id: true,
            bookingDate: true,
            endTime: true,
            field: { select: { name: true, venue: { select: { name: true } } } },
            customerId: true,
        },
    });

    const toComplete = confirmedBookings.filter(b => {
        const [h, m] = b.endTime.split(':').map(Number);
        const endDateTime = new Date(b.bookingDate);
        endDateTime.setHours(h, m, 0, 0);
        return endDateTime <= now;
    });

    if (toComplete.length > 0) {
        await prisma.booking.updateMany({
            where: { id: { in: toComplete.map(b => b.id) } },
            data: { status: 'COMPLETED' },
        });

        for (const b of toComplete) {
            await prisma.notification.create({
                data: {
                    userId: b.customerId,
                    type: 'BOOKING_COMPLETED',
                    title: 'Hoàn thành đặt sân ✅',
                    body: `Lịch đặt sân ${b.field.name} tại ${b.field.venue.name} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!`,
                    data: { bookingId: b.id },
                },
            });
        }

        console.log(`✅ [Worker] Auto-completed ${toComplete.length} booking(s)`);
    }
    return { completed: toComplete.length };
}

module.exports = { startCronJobs };
