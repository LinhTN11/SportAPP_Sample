const cron = require('node-cron');

/**
 * Start all cron jobs
 */
function startCronJobs(prisma) {
    console.log('⏰ Cron jobs started');

    // Job 1: Expire booking holds (every minute)
    cron.schedule('* * * * *', async () => {
        try {
            const expired = await prisma.booking.updateMany({
                where: {
                    status: 'PENDING_DEPOSIT',
                    holdExpiresAt: { lt: new Date() },
                },
                data: { status: 'EXPIRED' },
            });

            if (expired.count > 0) {
                console.log(`🔄 Expired ${expired.count} booking holds`);
            }
        } catch (err) {
            console.error('Expire holds job error:', err);
        }
    });

    // Job 2: Auto-match matchmaking posts (every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
        try {
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

            if (posts.length < 2) return;

            const matched = new Set();

            for (let i = 0; i < posts.length; i++) {
                if (matched.has(posts[i].id)) continue;

                for (let j = i + 1; j < posts.length; j++) {
                    if (matched.has(posts[j].id)) continue;

                    const a = posts[i];
                    const b = posts[j];

                    // Match criteria: same sport, same date, overlapping time, same city
                    const sameConditions =
                        a.sportType === b.sportType &&
                        a.bookingDate.toISOString() === b.bookingDate.toISOString() &&
                        a.city.toLowerCase() === b.city.toLowerCase() &&
                        a.startTime === b.startTime &&
                        a.endTime === b.endTime &&
                        a.userId !== b.userId;

                    if (sameConditions) {
                        console.log(`🤝 Auto-matching: ${a.user.fullName} ↔ ${b.user.fullName}`);

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
                        break;
                    }
                }
            }

            if (matched.size > 0) {
                console.log(`🤝 Auto-matched ${matched.size / 2} pairs`);
            }
        } catch (err) {
            console.error('Auto-match job error:', err);
        }
    });

    // Job 3: Expire old matchmaking posts (every hour)
    cron.schedule('0 * * * *', async () => {
        try {
            const expired = await prisma.matchmakingPost.updateMany({
                where: {
                    status: 'OPEN',
                    expiresAt: { lt: new Date() },
                },
                data: { status: 'EXPIRED' },
            });

            if (expired.count > 0) {
                console.log(`🔄 Expired ${expired.count} matchmaking posts`);
            }
        } catch (err) {
            console.error('Expire posts job error:', err);
        }
    });

    // Job 4: Mark completed bookings (daily at midnight)
    cron.schedule('0 0 * * *', async () => {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const completed = await prisma.booking.updateMany({
                where: {
                    status: 'CONFIRMED',
                    bookingDate: { lt: yesterday },
                },
                data: { status: 'COMPLETED' },
            });

            if (completed.count > 0) {
                console.log(`✅ Completed ${completed.count} past bookings`);
            }
        } catch (err) {
            console.error('Complete bookings job error:', err);
        }
    });
}

module.exports = { startCronJobs };
