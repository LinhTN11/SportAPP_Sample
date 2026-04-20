const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
    try {
        const bookingCount = await prisma.booking.count();
        const completedCount = await prisma.booking.count({ where: { status: 'COMPLETED' } });
        const confirmedCount = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
        const voucherCount = await prisma.taxVoucher.count();
        
        console.log('--- Database Status ---');
        console.log('Total Bookings:', bookingCount);
        console.log('Completed Bookings:', completedCount);
        console.log('Confirmed Bookings:', confirmedCount);
        console.log('Tax Vouchers:', voucherCount);
        
        if (completedCount > 0 && voucherCount === 0) {
            console.log('\nFound completed bookings but no vouchers generated.');
            const recentCompleted = await prisma.booking.findFirst({
                where: { status: 'COMPLETED' },
                orderBy: { bookingDate: 'desc' }
            });
            console.log('Most recent completed booking date:', recentCompleted.bookingDate);
        }
        
    } catch (error) {
        console.error('Error checking status:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatus();
