const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
    try {
        const ownerId = '1acf6df8-9af8-4fbc-8757-e863388bb8c1';
        const b = await prisma.booking.findMany({
            where: { field: { venue: { ownerId } } },
            select: { id: true, bookingDate: true, startTime: true, endTime: true, status: true, totalPrice: true }
        });

        console.log('--- ALL BOOKINGS ---');
        b.sort((x, y) => new Date(y.bookingDate) - new Date(x.bookingDate)).forEach(x => {
            console.log(`[${x.status}] | ${x.bookingDate.toISOString().split('T')[0]} | ${x.startTime}-${x.endTime} | ID: ${x.id.substring(0, 8)}`);
        });
        console.log('--- END ---');
    } catch(e) { console.error(e); } finally { await prisma.$disconnect(); }
}
checkAll();
