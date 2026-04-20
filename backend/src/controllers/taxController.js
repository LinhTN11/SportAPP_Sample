const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getSettings } = require('../config/platformSettings');

/**
 * Get tax vouchers for a specific owner
 */
const getVouchers = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const vouchers = await prisma.taxVoucher.findMany({
            where: { ownerId },
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' }
            ]
        });

        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Get all tax vouchers
 */
const getAllVouchers = async (req, res, next) => {
    try {
        const vouchers = await prisma.taxVoucher.findMany({
            include: { owner: { select: { id: true, fullName: true, email: true, phone: true, taxCode: true, address: true } } },
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Generate vouchers for all owners for a specific month
 * POST /api/tax/generate
 * Body: { month, year }
 */
const generateMonthlyVouchers = async (req, res, next) => {
    try {
        const { month, year } = req.body;
        
        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        // 1. Get all owners who had bookings in that period
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

        const results = [];

        for (const owner of owners) {
            // Calculate totals for this owner
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
            // Fallback: nếu ownerVat/ownerPit là null (booking cũ không có field này),
            // tính lại theo tỷ lệ chuẩn 5% VAT và 2% PIT trên tổng doanh thu
            const vatWithheld = stats._sum.ownerVat
                ? Number(stats._sum.ownerVat)
                : Math.round(Number(totalIncome) * 0.05);
            const pitWithheld = stats._sum.ownerPit
                ? Number(stats._sum.ownerPit)
                : Math.round(Number(totalIncome) * 0.02);

            // Generate unique voucher number
            const voucherNumber = `TNCN-${month.toString().padStart(2, '0')}-${year}-${owner.id.substring(0, 8).toUpperCase()}`;

            // Create or update voucher
            const voucher = await prisma.taxVoucher.upsert({
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

            results.push(voucher);
        }

        res.json({
            success: true,
            message: `Generated ${results.length} tax vouchers for ${month}/${year}`,
            data: results
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export voucher as HTML/PDF preview
 */
const exportVoucher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const voucher = await prisma.taxVoucher.findUnique({
            where: { id },
            include: { owner: true }
        });

        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Voucher not found' });
        }

        if (req.user.role !== 'ADMIN' && voucher.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const platform = getSettings();

        // Return a structured HTML template for the client to render/print
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #eee;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="margin: 0; color: #1a365d;">CHỨNG TỪ KHẤU TRỪ THUẾ THU NHẬP CÁ NHÂN</h2>
                    <p style="margin: 5px 0;">(Theo Nghị định số 123/2020/NĐ-CP ngày 19/10/2020 của Chính phủ)</p>
                    <p>Số: <strong>${voucher.voucherNumber}</strong></p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h4 style="border-bottom: 1px solid #333; padding-bottom: 5px;">I. THÔNG TIN TỔ CHỨC TRẢ THU NHẬP</h4>
                    <p>Tên tổ chức: <strong>${platform.platformName}</strong></p>
                    <p>Mã số thuế: <strong>${platform.taxCode || '<span style="color:#dc2626">Chưa cập nhật</span>'}</strong></p>
                    <p>Địa chỉ: ${platform.address || '<span style="color:#dc2626">Chưa cập nhật</span>'}</p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h4 style="border-bottom: 1px solid #333; padding-bottom: 5px;">II. THÔNG TIN NGƯỜI NỘP THUẾ</h4>
                    <p>Họ và tên: <strong>${voucher.owner.fullName}</strong></p>
                    <p>Mã số thuế: <strong>${voucher.owner.taxCode || '<span style="color:#dc2626;font-style:italic">Chưa cập nhật - vui lòng điền trong Cài đặt thuế</span>'}</strong></p>
                    <p>Điện thoại: ${voucher.owner.phone || 'Chưa cập nhật'}</p>
                    <p>Địa chỉ: ${voucher.owner.address || '<span style="color:#dc2626;font-style:italic">Chưa cập nhật - vui lòng điền trong Cài đặt thuế</span>'}</p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h4 style="border-bottom: 1px solid #333; padding-bottom: 5px;">III. THU NHẬP VÀ THUẾ KHẤU TRỪ</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr style="background: #f8fafc;">
                            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Nội dung</th>
                            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">Số tiền (VNĐ)</th>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 10px;">Tổng thu nhập chịu thuế (Tháng ${voucher.periodMonth}/${voucher.periodYear})</td>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">${Number(voucher.totalIncome).toLocaleString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 10px;">Thuế GTGT khấu trừ (5%)</td>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">${Number(voucher.vatWithheld).toLocaleString('vi-VN')}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; font-weight: bold;">Thuế TNCN khấu trừ (2%)</td>
                            <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-weight: bold;">${Number(voucher.pitWithheld).toLocaleString('vi-VN')}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; width: 45%;">
                        <p><strong>NGƯỜI NỘP THUẾ</strong></p>
                        <p style="font-size: 0.8em; font-style: italic;">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div style="text-align: center; width: 45%;">
                        <p>Ngày ${new Date(voucher.issueDate).getDate()} tháng ${new Date(voucher.issueDate).getMonth() + 1} năm ${new Date(voucher.issueDate).getFullYear()}</p>
                        <p><strong>ĐẠI DIỆN TỔ CHỨC TRẢ THU NHẬP</strong></p>
                        <p style="font-size: 0.8em; font-style: italic;">(Ký, đóng dấu và ghi rõ họ tên)</p>
                        <div style="margin-top: 20px; color: #dc2626; border: 2px solid #dc2626; display: inline-block; padding: 10px; font-weight: bold; text-transform: uppercase;">
                            Signed by SPORTAPP<br/>
                            Electronic Signature
                        </div>
                    </div>
                </div>
            </div>
        `;

        res.json({
            success: true,
            data: {
                html,
                voucher
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getVouchers,
    getAllVouchers,
    generateMonthlyVouchers,
    exportVoucher
};
