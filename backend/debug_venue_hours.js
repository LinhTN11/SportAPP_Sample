const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVenue() {
    try {
        const v = await prisma.venue.findUnique({
            where: { id: 'be995109-bdb5-4ea8-8d31-767ed1421240' },
            include: { fields: true }
        });
        console.log('--- VENUE INFO ---');
        console.log(`Name: ${v.name}`);
        console.log(`Open: ${v.openTime} | Close: ${v.closeTime}`);
        console.log(`Fields: ${v.fields.length}`);
        v.fields.forEach(f => console.log(`- ${f.name} (Active: ${f.isActive})`));
        console.log('--- END ---');
    } catch(e) { console.error(e); } finally { await prisma.$disconnect(); }
}
checkVenue();
