const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonthlyBookings() {
    try {
        const marchStart = new Date(2026, 2, 1);
        const marchEnd = new Date(2026, 3, 0, 23, 59, 59);
        const aprilStart = new Date(2026, 3, 1);
        const aprilEnd = new Date(2026, 4, 0, 23, 59, 59);

        const marchBookings = await prisma.booking.count({
            where: {
                status: 'COMPLETED',
                bookingDate: { gte: marchStart, lte: marchEnd }
            }
        });

        const aprilBookings = await prisma.booking.count({
            where: {
                status: 'COMPLETED',
                bookingDate: { gte: aprilStart, lte: aprilEnd }
            }
        });

        console.log('Bookings in March 2026:', marchBookings);
        console.log('Bookings in April 2026:', aprilBookings);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMonthlyBookings();
