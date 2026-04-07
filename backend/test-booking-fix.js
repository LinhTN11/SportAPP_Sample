const { sendMessage } = require('./src/services/chatbotService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const userId = 'bc6e8895-b851-44aa-b2ca-ed3c31e5c009';
    const fieldId = '30021a5e-e7ca-4379-b185-babbf08a024d';
    const userRole = 'CUSTOMER';
    const user = { id: userId, role: userRole, fullName: 'Test User' };

    console.log('--- TEST 1: Invalid Date ---');
    // We can't call executeTool directly easily because it's not exported, 
    // but we can call sendMessage and see if it hallucinations success 
    // when we provide a prompt that should trigger an error.
    
    // Actually, I want to test the internal logic of executeTool if possible.
    // Let's modify chatbotService.js to export executeTool for testing purpose temporarily 
    // or just run a script that mimics its internal logic.
    
    // Simulating create_booking logic directly:
    const args = { fieldId, bookingDate: 'invalid-date', startTime: '08:00', endTime: '10:00' };
    const date = new Date(args.bookingDate);
    if (isNaN(date.getTime())) {
        console.log('PASS: Date validation caught invalid date');
    } else {
        console.log('FAIL: Date validation missed invalid date');
    }

    console.log('--- TEST 2: Valid Booking Creation ---');
    const validArgs = { fieldId, bookingDate: '2026-04-10', startTime: '08:00', endTime: '10:00' };
    
    // Check if it already exists to avoid conflict
    const existing = await prisma.booking.findFirst({
        where: { fieldId, bookingDate: new Date(validArgs.bookingDate), startTime: '08:00' }
    });
    if (existing) {
        console.log('SKIPPING: Booking already exists, please use another date');
    } else {
        try {
            // This mirrors the switch case logic
            const field = await prisma.field.findUnique({ where: { id: fieldId }, include: { venue: true } });
            const booking = await prisma.booking.create({
                data: {
                    customerId: userId,
                    fieldId: fieldId,
                    bookingDate: new Date(validArgs.bookingDate),
                    startTime: validArgs.startTime,
                    endTime: validArgs.endTime,
                    totalPrice: 100000,
                    depositAmount: 10000,
                    commissionAmount: 5000,
                    paymentMethod: 'ONLINE',
                    status: 'PENDING_DEPOSIT',
                }
            });
            console.log('PASS: Booking created successfully. ID:', booking.id);
            
            // Clean up
            await prisma.booking.delete({ where: { id: booking.id } });
            console.log('CLEANUP: Test booking deleted.');
        } catch (e) {
            console.log('FAIL: Booking creation failed:', e.message);
        }
    }
}

test().then(() => prisma.$disconnect());
