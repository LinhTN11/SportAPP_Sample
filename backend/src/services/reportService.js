const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = require('docx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

const EXPORTS_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Owner: Generate revenue report (Excel)
 */
async function generateRevenueReport(ownerId, startDate, endDate) {
    const venues = await prisma.venue.findMany({
        where: { ownerId },
        include: {
            fields: {
                include: {
                    bookings: {
                        where: {
                            status: { in: ['CONFIRMED', 'COMPLETED'] },
                            bookingDate: {
                                gte: new Date(startDate),
                                lte: new Date(endDate),
                            },
                        },
                        include: { payments: { where: { status: 'SUCCESS' } } },
                    },
                },
            },
        },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SportApp';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo doanh thu');

    // Header styling
    const headerStyle = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
        },
    };

    // Title
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO DOANH THU';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF2E7D32' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = `Kỳ báo cáo: ${startDate} đến ${endDate}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.getCell('A2').font = { italic: true };

    // Headers
    const headers = ['STT', 'Sân', 'Tên sân con', 'Số booking', 'Tổng doanh thu (VNĐ)', 'Hoa hồng (VNĐ)', 'Thuế GTGT 10% (VNĐ)', 'Thực nhận (VNĐ)'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => Object.assign(cell, headerStyle));

    sheet.columns = [
        { width: 6 }, { width: 25 }, { width: 20 }, { width: 12 },
        { width: 20 }, { width: 18 }, { width: 18 }, { width: 20 },
    ];

    let grandTotal = 0, grandCommission = 0, grandTax = 0, grandNet = 0;
    let stt = 0;

    for (const venue of venues) {
        for (const field of venue.fields) {
            stt++;
            const totalRevenue = field.bookings.reduce((s, b) => s + Number(b.totalPrice), 0);
            const commission = field.bookings.reduce((s, b) => s + Number(b.commissionAmount), 0);
            const tax = Math.round(totalRevenue * 0.1);
            const net = totalRevenue - commission - tax;

            sheet.addRow([
                stt, venue.name, field.name, field.bookings.length,
                totalRevenue, commission, tax, net,
            ]);

            grandTotal += totalRevenue;
            grandCommission += commission;
            grandTax += tax;
            grandNet += net;
        }
    }

    // Summary row
    const sumRow = sheet.addRow(['', '', '', 'TỔNG CỘNG', grandTotal, grandCommission, grandTax, grandNet]);
    sumRow.font = { bold: true };
    sumRow.eachCell(cell => {
        cell.border = {
            top: { style: 'double' }, bottom: { style: 'double' },
            left: { style: 'thin' }, right: { style: 'thin' },
        };
    });

    // Format number cells
    for (let i = 4; i <= sheet.rowCount; i++) {
        for (let col = 5; col <= 8; col++) {
            const cell = sheet.getCell(i, col);
            cell.numFmt = '#,##0';
        }
    }

    const filename = `doanh_thu_${startDate}_${endDate}_${Date.now()}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);
    return { filepath, filename };
}

/**
 * Owner: Generate booking detail report (Excel)
 */
async function generateBookingReport(ownerId, startDate, endDate) {
    const bookings = await prisma.booking.findMany({
        where: {
            field: { venue: { ownerId } },
            bookingDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        include: {
            customer: { select: { fullName: true, phone: true, email: true } },
            field: { include: { venue: { select: { name: true } } } },
            payments: true,
        },
        orderBy: { bookingDate: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Chi tiết Booking');

    const headerStyle = {
        font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
    };

    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = 'BÁO CÁO CHI TIẾT BOOKING';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1565C0' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    const headers = ['STT', 'Ngày đặt', 'Sân', 'Sân con', 'Khách hàng', 'SĐT', 'Giờ', 'Tổng tiền (VNĐ)', 'Trạng thái', 'Thanh toán'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => Object.assign(cell, headerStyle));

    sheet.columns = [
        { width: 6 }, { width: 14 }, { width: 20 }, { width: 15 },
        { width: 20 }, { width: 14 }, { width: 14 }, { width: 18 },
        { width: 15 }, { width: 15 },
    ];

    const statusMap = {
        PENDING_DEPOSIT: 'Chờ cọc', CONFIRMED: 'Đã xác nhận',
        COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn',
    };

    bookings.forEach((b, i) => {
        sheet.addRow([
            i + 1,
            b.bookingDate.toISOString().split('T')[0],
            b.field.venue.name,
            b.field.name,
            b.customer.fullName,
            b.customer.phone || '',
            `${b.startTime}-${b.endTime}`,
            Number(b.totalPrice),
            statusMap[b.status] || b.status,
            b.payments.length > 0 ? 'Đã TT' : 'Chưa TT',
        ]);
    });

    for (let i = 3; i <= sheet.rowCount; i++) {
        sheet.getCell(i, 8).numFmt = '#,##0';
    }

    const filename = `booking_${startDate}_${endDate}_${Date.now()}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);
    return { filepath, filename };
}

/**
 * Admin: Generate platform-wide report (Excel)
 */
async function generatePlatformReport(startDate, endDate) {
    const dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
    };

    const [totalUsers, totalVenues, totalBookings, bookings, revenueAgg] = await Promise.all([
        prisma.user.count(),
        prisma.venue.count({ where: { status: 'APPROVED' } }),
        prisma.booking.count({ where: { bookingDate: dateFilter } }),
        prisma.booking.findMany({
            where: { bookingDate: dateFilter, status: { in: ['CONFIRMED', 'COMPLETED'] } },
            include: { field: { include: { venue: { select: { name: true, ownerId: true } } } } },
        }),
        prisma.booking.aggregate({
            where: { bookingDate: dateFilter, status: { in: ['CONFIRMED', 'COMPLETED'] } },
            _sum: { totalPrice: true, commissionAmount: true },
        }),
    ]);

    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summary = workbook.addWorksheet('Tổng quan');
    summary.mergeCells('A1:D1');
    summary.getCell('A1').value = 'BÁO CÁO TỔNG QUAN NỀN TẢNG SPORTAPP';
    summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFD84315' } };
    summary.getCell('A1').alignment = { horizontal: 'center' };

    summary.mergeCells('A2:D2');
    summary.getCell('A2').value = `Kỳ báo cáo: ${startDate} đến ${endDate}`;
    summary.getCell('A2').alignment = { horizontal: 'center' };

    summary.columns = [{ width: 30 }, { width: 25 }, { width: 20 }, { width: 20 }];

    const metrics = [
        ['Tổng người dùng', totalUsers],
        ['Tổng sân đã duyệt', totalVenues],
        ['Tổng booking trong kỳ', totalBookings],
        ['Tổng doanh thu (VNĐ)', Number(revenueAgg._sum.totalPrice || 0)],
        ['Tổng hoa hồng (VNĐ)', Number(revenueAgg._sum.commissionAmount || 0)],
    ];

    summary.addRow([]);
    metrics.forEach(([label, value]) => {
        const row = summary.addRow([label, value]);
        row.getCell(1).font = { bold: true };
        if (typeof value === 'number' && value > 999) {
            row.getCell(2).numFmt = '#,##0';
        }
    });

    // Venue breakdown sheet
    const venueSheet = workbook.addWorksheet('Theo sân');
    const venueHeaders = ['STT', 'Tên sân', 'Số booking', 'Doanh thu (VNĐ)', 'Hoa hồng (VNĐ)'];
    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD84315' } },
        alignment: { horizontal: 'center' },
    };

    const vHeaderRow = venueSheet.addRow(venueHeaders);
    vHeaderRow.eachCell(cell => Object.assign(cell, headerStyle));
    venueSheet.columns = [{ width: 6 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 20 }];

    // Group by venue
    const venueMap = {};
    for (const b of bookings) {
        const vName = b.field.venue.name;
        if (!venueMap[vName]) venueMap[vName] = { count: 0, revenue: 0, commission: 0 };
        venueMap[vName].count++;
        venueMap[vName].revenue += Number(b.totalPrice);
        venueMap[vName].commission += Number(b.commissionAmount);
    }

    Object.entries(venueMap).forEach(([name, data], i) => {
        venueSheet.addRow([i + 1, name, data.count, data.revenue, data.commission]);
    });

    for (let i = 2; i <= venueSheet.rowCount; i++) {
        venueSheet.getCell(i, 4).numFmt = '#,##0';
        venueSheet.getCell(i, 5).numFmt = '#,##0';
    }

    const filename = `platform_report_${startDate}_${endDate}_${Date.now()}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);
    return { filepath, filename };
}

module.exports = {
    generateRevenueReport,
    generateBookingReport,
    generatePlatformReport,
};
