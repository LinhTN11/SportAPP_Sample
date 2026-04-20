const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateVouchers(month, year) {
    console.log(`Generating vouchers for ${month}/${year}...`);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const owners = await prisma.user.findMany({
        where: {
            role: 'OWNER',
            venues: {
                some: {
                    fields: {
                        some: {
                            bookings: {
                                some: {
                                    status: 'COMPLETED',
                                    bookingDate: { gte: startDate, lte: endDate }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    for (const owner of owners) {
        const stats = await prisma.booking.aggregate({
            where: {
                status: 'COMPLETED',
                bookingDate: { gte: startDate, lte: endDate },
                field: { venue: { ownerId: owner.id } }
            },
            _sum: {
                totalPrice: true,
                ownerVat: true,
                ownerPit: true
            }
        });

        if (!stats._sum.totalPrice) continue;

        const totalIncome = stats._sum.totalPrice;
        const vatWithheld = stats._sum.ownerVat || 0;
        const pitWithheld = stats._sum.ownerPit || 0;
        const voucherNumber = `TNCN-${month.toString().padStart(2, '0')}-${year}-${owner.id.substring(0, 8).toUpperCase()}`;

        await prisma.taxVoucher.upsert({
            where: { voucherNumber },
            update: {
                totalIncome,
                vatWithheld,
                pitWithheld,
                issueDate: new Date()
            },
            create: {
                ownerId: owner.id,
                voucherNumber,
                periodMonth: parseInt(month),
                periodYear: parseInt(year),
                totalIncome,
                vatWithheld,
                pitWithheld,
                issueDate: new Date()
            }
        });
        console.log(`Generated voucher for owner ${owner.fullName}: ${voucherNumber}`);
    }
}

async function main() {
    try {
        await generateVouchers(3, 2026);
        await generateVouchers(4, 2026);
        console.log('Finished generating vouchers.');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
