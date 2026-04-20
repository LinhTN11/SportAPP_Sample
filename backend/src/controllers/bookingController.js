const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateTotalPrice, getUnavailableFieldIds } = require('../services/bookingService');

// POST /api/bookings/search
const searchFields = async (req, res, next) => {
    try {
        const { sportType, city, district, bookingDate, startTime, endTime } = req.body;

        const where = {
            status: 'APPROVED',
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(district && { district: { contains: district, mode: 'insensitive' } }),
        };

        const venues = await prisma.venue.findMany({
            where,
            include: {
                owner: { select: { id: true, fullName: true, phone: true } },
                fields: {
                    where: {
                        isActive: true,
                        ...(sportType && { sportType }),
                    },
                    include: {
                        pricingRules: { where: { isActive: true } },
                        parentComposites: { include: { childField: true } },
                        childComposites: { include: { parentField: true } },
                    },
                },
                _count: { select: { reviews: true } },
            },
        });

        const unavailableIds = await getUnavailableFieldIds(bookingDate, startTime, endTime);

        const results = venues.map(venue => {
            let availableFields = venue.fields.filter(f => !unavailableIds.has(f.id));

            availableFields = availableFields.filter(field => {
                if (field.parentComposites.length > 0) {
                    const childIds = field.parentComposites.map(c => c.childFieldId);
                    return !childIds.some(id => unavailableIds.has(id));
                }
                if (field.childComposites.length > 0) {
                    const parentIds = field.childComposites.map(c => c.parentFieldId);
                    return !parentIds.some(id => unavailableIds.has(id));
                }
                return true;
            });

            return {
                ...venue,
                fields: availableFields,
                fieldCount: availableFields.length,
            };
        }).filter(v => v.fields.length > 0);

        res.json({
            success: true,
            data: { venues: results },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
    try {
        const { fieldId, bookingDate, startTime, endTime, paymentMethod } = req.body;

        const field = await prisma.field.findUnique({
            where: { id: fieldId },
            include: {
                venue: true,
                parentComposites: true,
                childComposites: true,
            },
        });

        if (!field || !field.isActive) {
            return res.status(404).json({ success: false, message: 'Field not found or inactive' });
        }

        const unavailableIds = await getUnavailableFieldIds(bookingDate, startTime, endTime);
        if (unavailableIds.has(fieldId)) {
            return res.status(409).json({ success: false, message: 'Field is already booked for this time slot' });
        }

        const relatedFieldIds = [
            ...field.parentComposites.map(c => c.childFieldId),
            ...field.childComposites.map(c => c.parentFieldId),
        ];
        const hasConflict = relatedFieldIds.some(id => unavailableIds.has(id));
        if (hasConflict) {
            return res.status(409).json({
                success: false,
                message: 'A related field (parent/child) is already booked for this time',
            });
        }

        const totalPrice = await calculateTotalPrice(fieldId, bookingDate, startTime, endTime);
        const depositRate = parseFloat(process.env.DEFAULT_DEPOSIT_RATE) || 0.10;
        const depositAmount = Math.round(totalPrice * depositRate);

        // Platform base fee + Platform VAT (10%)
        const commissionRate = parseFloat(field.venue.commissionRate) || 0.05;
        const platformFee = Math.round(totalPrice * commissionRate);
        const platformVat = Math.round(platformFee * 0.10);
        const commissionAmount = platformFee + platformVat;

        // Owner Taxes: 5% VAT, 2% PIT
        const ownerVat = Math.round(totalPrice * 0.05);
        const ownerPit = Math.round(totalPrice * 0.02);

        const holdMinutes = field.venue.holdDurationMinutes || 10;
        const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

        const booking = await prisma.booking.create({
            data: {
                customerId: req.user.id,
                fieldId,
                bookingDate: new Date(bookingDate),
                startTime,
                endTime,
                totalPrice,
                depositAmount,
                commissionAmount,
                platformFee,
                platformVat,
                ownerVat,
                ownerPit,
                paymentMethod,
                status: 'PENDING_DEPOSIT',
                holdExpiresAt,
            },
            include: {
                field: {
                    include: { venue: { select: { id: true, name: true } } },
                },
            },
        });

        res.status(201).json({
            success: true,
            message: `Booking created. You have ${holdMinutes} minutes to complete payment.`,
            data: {
                booking,
                payment: {
                    depositAmount,
                    totalPrice,
                    commissionAmount,
                    holdExpiresAt,
                    holdMinutes,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/bookings/:id/confirm
const confirmBooking = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: { field: { include: { venue: true } } },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.customerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (booking.status !== 'PENDING_DEPOSIT') {
            return res.status(400).json({ success: false, message: 'Booking is not awaiting deposit' });
        }

        if (booking.holdExpiresAt && new Date() > new Date(booking.holdExpiresAt)) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'EXPIRED' },
            });
            return res.status(410).json({ success: false, message: 'Hold has expired. Please create a new booking.' });
        }

        const payAmount = booking.paymentMethod === 'ONLINE'
            ? booking.totalPrice
            : booking.depositAmount;

        await prisma.payment.create({
            data: {
                bookingId: booking.id,
                amount: payAmount,
                type: booking.paymentMethod === 'ONLINE' ? 'FULL_PAYMENT' : 'DEPOSIT',
                method: 'MOCK_VNPAY',
                status: 'SUCCESS',
                transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            },
        });

        const updated = await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED' },
            include: {
                field: { include: { venue: { select: { id: true, name: true } } } },
                customer: { select: { id: true, fullName: true, email: true } },
            },
        });

        await prisma.notification.create({
            data: {
                userId: booking.customerId,
                type: 'BOOKING_CONFIRMED',
                title: 'Booking confirmed! ✅',
                body: `Your booking at ${booking.field.venue.name} on ${booking.bookingDate.toISOString().split('T')[0]} from ${booking.startTime} to ${booking.endTime} is confirmed.`,
                data: { bookingId: booking.id },
            },
        });

        await prisma.notification.create({
            data: {
                userId: booking.field.venue.ownerId,
                type: 'BOOKING_CONFIRMED',
                title: 'New booking! 📅',
                body: `${req.user.fullName} booked ${booking.field.name} on ${booking.bookingDate.toISOString().split('T')[0]} (${booking.startTime} - ${booking.endTime})`,
                data: { bookingId: booking.id },
            },
        });

        res.json({
            success: true,
            message: 'Booking confirmed',
            data: { booking: updated },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
            include: { field: { include: { venue: true } } },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const isCustomer = booking.customerId === req.user.id;
        const isOwner = booking.field.venue.ownerId === req.user.id;

        if (!isCustomer && !isOwner) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!['PENDING_DEPOSIT', 'CONFIRMED'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Booking cannot be cancelled' });
        }

        let cancellationFee = 0;
        let cancelledBy;

        if (isCustomer) {
            cancellationFee = Number(booking.depositAmount);
            cancelledBy = 'CUSTOMER';
        } else if (isOwner) {
            const bookingDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.startTime}:00`);
            const hoursUntil = (bookingDateTime - new Date()) / (1000 * 60 * 60);

            if (hoursUntil < 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Owners must cancel at least 24 hours before the booking time',
                });
            }

            cancellationFee = 0;
            cancelledBy = 'OWNER';

            await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    amount: booking.depositAmount,
                    type: 'REFUND',
                    method: 'MOCK_VNPAY',
                    status: 'SUCCESS',
                    transactionId: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                },
            });
        }

        const updated = await prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CANCELLED',
                cancelledBy,
                cancelledAt: new Date(),
                cancellationFee,
            },
        });

        const notifyUserId = isCustomer ? booking.field.venue.ownerId : booking.customerId;
        await prisma.notification.create({
            data: {
                userId: notifyUserId,
                type: 'BOOKING_CANCELLED',
                title: 'Booking cancelled',
                body: `Booking for ${booking.field.name} on ${booking.bookingDate.toISOString().split('T')[0]} has been cancelled by ${cancelledBy.toLowerCase()}.`,
                data: { bookingId: booking.id },
            },
        });

        res.json({
            success: true,
            message: 'Booking cancelled',
            data: { booking: updated, cancellationFee },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/my
const getMyBookings = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            customerId: req.user.id,
            ...(status && { status }),
        };

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    field: {
                        include: {
                            venue: {
                                select: { id: true, name: true, address: true, images: true },
                            },
                        },
                    },
                    payments: true,
                    review: true,
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/venue/:venueId
const getVenueBookings = async (req, res, next) => {
    try {
        const venue = await prisma.venue.findUnique({ where: { id: req.params.venueId } });
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        if (venue.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { date, status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            field: { venueId: req.params.venueId },
            ...(status && { status }),
            ...(date && { bookingDate: new Date(date) }),
        };

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    customer: { select: { id: true, fullName: true, phone: true, email: true } },
                    field: { select: { id: true, name: true } },
                    payments: true,
                },
                skip,
                take: parseInt(limit),
                orderBy: { bookingDate: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/bookings/field/:fieldId/slots
const getFieldSlots = async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const bookings = await prisma.booking.findMany({
            where: {
                fieldId: req.params.fieldId,
                bookingDate: new Date(date),
                status: { in: ['PENDING_DEPOSIT', 'CONFIRMED'] },
            },
            select: {
                startTime: true,
                endTime: true,
            },
        });

        res.json({
            success: true,
            data: { bookedSlots: bookings },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchFields,
    createBooking,
    confirmBooking,
    cancelBooking,
    getMyBookings,
    getVenueBookings,
    getFieldSlots,
};
