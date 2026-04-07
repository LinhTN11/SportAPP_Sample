const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- DB DEBUG START ---');
        const owners = await prisma.user.findMany({ 
            where: { role: 'OWNER' },
            select: { id: true, fullName: true, role: true }
        });
        
        console.log(`Found ${owners.length} owners.`);
        
        for (const o of owners) {
            const venueCount = await prisma.venue.count({ where: { ownerId: o.id } });
            const bookingCount = await prisma.booking.count({ 
                where: { field: { venue: { ownerId: o.id } } } 
            });
            console.log(`Owner: ${o.fullName} | ID: ${o.id} | Venues: ${venueCount} | Total Bookings: ${bookingCount}`);
            
            if (venueCount > 0) {
                const venues = await prisma.venue.findMany({ 
                    where: { ownerId: o.id },
                    select: { id: true, name: true }
                });
                for (const v of venues) {
                    const vBookings = await prisma.booking.count({ 
                        where: { field: { venueId: v.id } } 
                    });
                    console.log(`   -> Venue: ${v.name} | ID: ${v.id} | Bookings: ${vBookings}`);
                }
            }
        }
        console.log('--- DB DEBUG END ---');
    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
