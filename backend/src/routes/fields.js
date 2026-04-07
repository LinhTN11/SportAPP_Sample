const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, createFieldValidation, createPricingValidation } = require('../middleware/validate');
const {
    createField,
    getVenueFields,
    updateField,
    deleteField,
    createPricing,
    getPricing,
    updatePricing,
    deletePricing,
} = require('../controllers/fieldController');

// Field CRUD
router.post('/:venueId', authenticate, authorize('OWNER'), validate(createFieldValidation), createField);
router.get('/venue/:venueId', getVenueFields);
router.put('/:id', authenticate, authorize('OWNER'), updateField);
router.delete('/:id', authenticate, authorize('OWNER'), deleteField);

// Pricing rules
router.post('/:fieldId/pricing', authenticate, authorize('OWNER'), validate(createPricingValidation), createPricing);
router.get('/:fieldId/pricing', getPricing);
router.put('/pricing/:ruleId', authenticate, authorize('OWNER'), updatePricing);
router.delete('/pricing/:ruleId', authenticate, authorize('OWNER'), deletePricing);

module.exports = router;
