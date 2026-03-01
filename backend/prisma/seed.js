const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clean existing data
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatRoomMember.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.matchRequest.deleteMany();
    await prisma.matchmakingPost.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.fieldPricingRule.deleteMany();
    await prisma.fieldComposite.deleteMany();
    await prisma.field.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 12);

    // Create Admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@sportapp.com',
            passwordHash,
            fullName: 'Admin SportApp',
            phone: '0901234567',
            role: 'ADMIN',
            isVerified: true,
        },
    });
    console.log('✅ Admin created:', admin.email);

    // Create Owner
    const owner = await prisma.user.create({
        data: {
            email: 'owner@sportapp.com',
            passwordHash,
            fullName: 'Nguyễn Văn Chủ Sân',
            phone: '0909876543',
            role: 'OWNER',
            isVerified: true,
        },
    });
    console.log('✅ Owner created:', owner.email);

    // Create Customers
    const customer1 = await prisma.user.create({
        data: {
            email: 'khach1@sportapp.com',
            passwordHash,
            fullName: 'Trần Minh Khách',
            phone: '0912345678',
            role: 'CUSTOMER',
            isVerified: true,
        },
    });

    const customer2 = await prisma.user.create({
        data: {
            email: 'khach2@sportapp.com',
            passwordHash,
            fullName: 'Lê Thị Vân',
            phone: '0923456789',
            role: 'CUSTOMER',
            isVerified: true,
        },
    });
    console.log('✅ Customers created');

    // Create Venue (APPROVED)
    const venue = await prisma.venue.create({
        data: {
            ownerId: owner.id,
            name: 'Sân Bóng Đá Thống Nhất',
            address: '123 Đường Nguyễn Huệ',
            city: 'Hồ Chí Minh',
            district: 'Quận 1',
            latitude: 10.7751,
            longitude: 106.7012,
            sportTypes: ['football'],
            description: 'Sân bóng đá mini hiện đại, có đèn chiếu sáng, mặt cỏ nhân tạo chất lượng cao.',
            images: [],
            status: 'APPROVED',
            bookingUrl: 'http://localhost:3000/book/san-bong-da-thong-nhat',
            openTime: '06:00',
            closeTime: '23:00',
            holdDurationMinutes: 10,
        },
    });
    console.log('✅ Venue created:', venue.name);

    // Create Fields
    const field1 = await prisma.field.create({
        data: {
            venueId: venue.id,
            name: 'Sân 1 (5 người)',
            sportType: 'football',
            fieldType: 'STANDARD',
            capacity: 5,
        },
    });

    const field2 = await prisma.field.create({
        data: {
            venueId: venue.id,
            name: 'Sân 2 (5 người)',
            sportType: 'football',
            fieldType: 'STANDARD',
            capacity: 5,
        },
    });

    const fieldBig = await prisma.field.create({
        data: {
            venueId: venue.id,
            name: 'Sân Lớn (11 người)',
            sportType: 'football',
            fieldType: 'COMBINED',
            capacity: 11,
        },
    });

    // Create composite: Big field = Field1 + Field2
    await prisma.fieldComposite.createMany({
        data: [
            { parentFieldId: fieldBig.id, childFieldId: field1.id },
            { parentFieldId: fieldBig.id, childFieldId: field2.id },
        ],
    });
    console.log('✅ Fields created (2 standard + 1 combined)');

    // Create Pricing Rules
    const pricingData = [
        // Field 1 pricing
        { fieldId: field1.id, dayOfWeek: [], startTime: '06:00', endTime: '17:00', price: 300000, label: 'Giờ thường' },
        { fieldId: field1.id, dayOfWeek: [], startTime: '17:00', endTime: '21:00', price: 500000, label: 'Cao điểm' },
        { fieldId: field1.id, dayOfWeek: [], startTime: '21:00', endTime: '23:00', price: 400000, label: 'Giờ tối' },
        // Field 2 pricing (same as field 1)
        { fieldId: field2.id, dayOfWeek: [], startTime: '06:00', endTime: '17:00', price: 300000, label: 'Giờ thường' },
        { fieldId: field2.id, dayOfWeek: [], startTime: '17:00', endTime: '21:00', price: 500000, label: 'Cao điểm' },
        { fieldId: field2.id, dayOfWeek: [], startTime: '21:00', endTime: '23:00', price: 400000, label: 'Giờ tối' },
        // Big field pricing
        { fieldId: fieldBig.id, dayOfWeek: [], startTime: '06:00', endTime: '17:00', price: 700000, label: 'Giờ thường' },
        { fieldId: fieldBig.id, dayOfWeek: [], startTime: '17:00', endTime: '21:00', price: 1200000, label: 'Cao điểm' },
        { fieldId: fieldBig.id, dayOfWeek: [], startTime: '21:00', endTime: '23:00', price: 900000, label: 'Giờ tối' },
    ];

    await prisma.fieldPricingRule.createMany({ data: pricingData });
    console.log('✅ Pricing rules created');

    // Create a second venue (PENDING)
    const venue2 = await prisma.venue.create({
        data: {
            ownerId: owner.id,
            name: 'Sân Cầu Lông Star',
            address: '456 Đường Lê Lợi',
            city: 'Hồ Chí Minh',
            district: 'Quận 3',
            sportTypes: ['badminton'],
            description: 'Sân cầu lông trong nhà, có điều hòa.',
            status: 'PENDING',
            openTime: '07:00',
            closeTime: '22:00',
        },
    });
    console.log('✅ Pending venue created:', venue2.name);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials (password for all: password123):');
    console.log(`   Admin:    ${admin.email}`);
    console.log(`   Owner:    ${owner.email}`);
    console.log(`   Customer: ${customer1.email}`);
    console.log(`   Customer: ${customer2.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
