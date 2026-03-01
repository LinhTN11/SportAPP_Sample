const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createFieldValidation, createPricingValidation } = require('../middleware/validate');

// POST /api/fields/:venueId - Owner adds field to venue
router.post('/:venueId', authenticate, authorize('OWNER'), validate(createFieldValidation), async (req, res, next) => {
    try {
        const { venueId } = req.params;

        // Verify ownership
        const venue = await prisma.venue.findUnique({ where: { id: venueId } });
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        if (venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (venue.status !== 'APPROVED') {
            return res.status(400).json({ success: false, message: 'Venue must be approved first' });
        }

        const { name, sportType, fieldType, capacity, childFieldIds } = req.body;

        // Create field
        const field = await prisma.field.create({
            data: {
                venueId,
                name,
                sportType,
                fieldType: fieldType || 'STANDARD',
                capacity,
            },
        });

        // If COMBINED type, create composite links
        if (fieldType === 'COMBINED' && childFieldIds && childFieldIds.length > 0) {
            const composites = childFieldIds.map(childId => ({
                parentFieldId: field.id,
                childFieldId: childId,
            }));

            await prisma.fieldComposite.createMany({ data: composites });
        }

        // Fetch full field with composites
        const fullField = await prisma.field.findUnique({
            where: { id: field.id },
            include: {
                parentComposites: { include: { childField: true } },
                pricingRules: true,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Field created',
            data: { field: fullField },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/fields/venue/:venueId - Get all fields of a venue
router.get('/venue/:venueId', async (req, res, next) => {
    try {
        const fields = await prisma.field.findMany({
            where: {
                venueId: req.params.venueId,
                isActive: true,
            },
            include: {
                pricingRules: { where: { isActive: true } },
                parentComposites: {
                    include: { childField: { select: { id: true, name: true } } },
                },
                childComposites: {
                    include: { parentField: { select: { id: true, name: true } } },
                },
            },
        });

        res.json({ success: true, data: { fields } });
    } catch (error) {
        next(error);
    }
});

// PUT /api/fields/:id - Owner updates field
router.put('/:id', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const field = await prisma.field.findUnique({
            where: { id: req.params.id },
            include: { venue: true },
        });

        if (!field) {
            return res.status(404).json({ success: false, message: 'Field not found' });
        }
        if (field.venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { name, sportType, capacity, isActive } = req.body;

        const updated = await prisma.field.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(sportType && { sportType }),
                ...(capacity !== undefined && { capacity }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        res.json({
            success: true,
            message: 'Field updated',
            data: { field: updated },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/fields/:id
router.delete('/:id', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const field = await prisma.field.findUnique({
            where: { id: req.params.id },
            include: { venue: true },
        });

        if (!field) {
            return res.status(404).json({ success: false, message: 'Field not found' });
        }
        if (field.venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await prisma.field.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Field deleted' });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// PRICING RULES
// ==========================================

// POST /api/fields/:fieldId/pricing - Owner sets pricing
router.post('/:fieldId/pricing', authenticate, authorize('OWNER'), validate(createPricingValidation), async (req, res, next) => {
    try {
        const field = await prisma.field.findUnique({
            where: { id: req.params.fieldId },
            include: { venue: true },
        });

        if (!field) {
            return res.status(404).json({ success: false, message: 'Field not found' });
        }
        if (field.venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { dayOfWeek, startTime, endTime, price, label } = req.body;

        const rule = await prisma.fieldPricingRule.create({
            data: {
                fieldId: req.params.fieldId,
                dayOfWeek: dayOfWeek || [],
                startTime,
                endTime,
                price,
                label,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Pricing rule created',
            data: { rule },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/fields/:fieldId/pricing - Get pricing rules
router.get('/:fieldId/pricing', async (req, res, next) => {
    try {
        const rules = await prisma.fieldPricingRule.findMany({
            where: {
                fieldId: req.params.fieldId,
                isActive: true,
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({ success: true, data: { rules } });
    } catch (error) {
        next(error);
    }
});

// PUT /api/fields/pricing/:ruleId - Update pricing rule
router.put('/pricing/:ruleId', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const rule = await prisma.fieldPricingRule.findUnique({
            where: { id: req.params.ruleId },
            include: { field: { include: { venue: true } } },
        });

        if (!rule) {
            return res.status(404).json({ success: false, message: 'Pricing rule not found' });
        }
        if (rule.field.venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { dayOfWeek, startTime, endTime, price, label, isActive } = req.body;

        const updated = await prisma.fieldPricingRule.update({
            where: { id: req.params.ruleId },
            data: {
                ...(dayOfWeek !== undefined && { dayOfWeek }),
                ...(startTime && { startTime }),
                ...(endTime && { endTime }),
                ...(price !== undefined && { price }),
                ...(label !== undefined && { label }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        res.json({
            success: true,
            message: 'Pricing rule updated',
            data: { rule: updated },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/fields/pricing/:ruleId
router.delete('/pricing/:ruleId', authenticate, authorize('OWNER'), async (req, res, next) => {
    try {
        const rule = await prisma.fieldPricingRule.findUnique({
            where: { id: req.params.ruleId },
            include: { field: { include: { venue: true } } },
        });

        if (!rule) {
            return res.status(404).json({ success: false, message: 'Pricing rule not found' });
        }
        if (rule.field.venue.ownerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await prisma.fieldPricingRule.delete({ where: { id: req.params.ruleId } });

        res.json({ success: true, message: 'Pricing rule deleted' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
