const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBookings() {
    try {
        const userId = '1acf6df8-9af8-4fbc-8757-e863388bb8c1';
        const bookings = await prisma.booking.findMany({
            where: {
                field: { venue: { ownerId: userId } },
                status: { in: ['CONFIRMED', 'COMPLETED'] }
            },
            select: {
                bookingDate: true,
                startTime: true,
                endTime: true,
                status: true,
                totalPrice: true
            }
        });

        console.log('--- BOOKINGS LIST ---');
        bookings.forEach(b => {
            console.log(`Date: ${b.bookingDate.toISOString().split('T')[0]} | Time: ${b.startTime}-${b.endTime} | Status: ${b.status} | Price: ${b.totalPrice}`);
        });
        console.log('--- END ---');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugBookings();
