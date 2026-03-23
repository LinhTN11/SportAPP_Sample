const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, createFieldValidation, createPricingValidation } = require('../middlewares/validate');

const {
    createField,
    listFieldsByVenue,
    updateField,
    deleteField,
    createPricingRule,
    listPricingRules,
    updatePricingRule,
    deletePricingRule,
} = require('../controllers/field.controller');

// POST /api/fields/:venueId - Owner adds field to venue
router.post('/:venueId', authenticate, authorize('OWNER'), validate(createFieldValidation), createField);

// GET /api/fields/venue/:venueId - Get all fields of a venue
router.get('/venue/:venueId', listFieldsByVenue);

// PUT /api/fields/:id - Owner updates field
router.put('/:id', authenticate, authorize('OWNER'), updateField);

// DELETE /api/fields/:id
router.delete('/:id', authenticate, authorize('OWNER'), deleteField);

// ==========================================
// PRICING RULES
// ==========================================

// POST /api/fields/:fieldId/pricing - Owner sets pricing
router.post('/:fieldId/pricing', authenticate, authorize('OWNER'), validate(createPricingValidation), createPricingRule);

// GET /api/fields/:fieldId/pricing - Get pricing rules
router.get('/:fieldId/pricing', listPricingRules);

// PUT /api/fields/pricing/:ruleId - Update pricing rule
router.put('/pricing/:ruleId', authenticate, authorize('OWNER'), updatePricingRule);

// DELETE /api/fields/pricing/:ruleId
router.delete('/pricing/:ruleId', authenticate, authorize('OWNER'), deletePricingRule);

module.exports = router;
