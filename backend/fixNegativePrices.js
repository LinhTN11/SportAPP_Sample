const { PrismaClient } = require('@prisma/client');
const { calculateTotalPrice } = require('./src/services/bookingService');

const prisma = new PrismaClient();

async function fixNegativePrices() {
    try {
        const negativeBookings = await prisma.booking.findMany({
            where: {
                totalPrice: { lt: 0 }
            }
        });

        console.log(`Found ${negativeBookings.length} bookings with negative total price.`);

        for (const booking of negativeBookings) {
            try {
                // Recalculate using the fixed logic
                const newPrice = await calculateTotalPrice(
                    booking.fieldId,
                    booking.bookingDate,
                    booking.startTime,
                    booking.endTime
                );

                console.log(`Booking ID ${booking.id}: Old Price: ${booking.totalPrice} -> New Price: ${newPrice}`);

                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { totalPrice: newPrice }
                });
            } catch (err) {
                console.error(`Error fixing booking ${booking.id}:`, err.message);
            }
        }
        
        console.log('Finished fixing negative prices.');
    } catch (error) {
        console.error('Error in script:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixNegativePrices();
