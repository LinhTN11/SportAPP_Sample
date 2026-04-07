const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const venues = await prisma.venue.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true, city: true, district: true, latitude: true, longitude: true }
    });
    console.log(JSON.stringify(venues, null, 2));
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
