const { body, param, query } = require('express-validator');

const validate = (validations) => {
    return async (req, res, next) => {
        for (const validation of validations) {
            const result = await validation.run(req);
            if (!result.isEmpty()) break;
        }

        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
            })),
        });
    };
};

// Auth validations
const registerValidation = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('fullName')
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be 2-100 characters'),
    body('phone').optional().isMobilePhone('vi-VN').withMessage('Invalid phone number'),
    body('role')
        .optional()
        .isIn(['CUSTOMER', 'OWNER'])
        .withMessage('Role must be CUSTOMER or OWNER'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Venue validations
const createVenueValidation = [
    body('name').notEmpty().withMessage('Venue name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('district').notEmpty().withMessage('District is required'),
    body('sportTypes')
        .isArray({ min: 1 })
        .withMessage('At least one sport type is required'),
];

// Field validations
const createFieldValidation = [
    body('name').notEmpty().withMessage('Field name is required'),
    body('sportType').notEmpty().withMessage('Sport type is required'),
    body('fieldType')
        .optional()
        .isIn(['STANDARD', 'COMBINED'])
        .withMessage('Field type must be STANDARD or COMBINED'),
];

// Pricing validations
const createPricingValidation = [
    body('startTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Start time must be in HH:mm format'),
    body('endTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('End time must be in HH:mm format'),
    body('price')
        .isNumeric()
        .withMessage('Price must be a number')
        .custom(val => val > 0)
        .withMessage('Price must be positive'),
];

// Booking validations
const createBookingValidation = [
    body('fieldId').isUUID().withMessage('Valid field ID is required'),
    body('bookingDate').isDate().withMessage('Valid booking date is required'),
    body('startTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Start time must be in HH:mm format'),
    body('endTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('End time must be in HH:mm format'),
    body('paymentMethod')
        .isIn(['ONLINE', 'DIRECT'])
        .withMessage('Payment method must be ONLINE or DIRECT'),
];

// Matchmaking validations
const createMatchPostValidation = [
    body('bookingDate').isDate().withMessage('Valid booking date is required'),
    body('startTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Start time must be in HH:mm format'),
    body('endTime')
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('End time must be in HH:mm format'),
    body('sportType').notEmpty().withMessage('Sport type is required'),
    body('city').notEmpty().withMessage('City is required'),
];

// Review validations
const createReviewValidation = [
    body('bookingId').isUUID().withMessage('Valid booking ID is required'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isLength({ max: 1000 }),
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    createVenueValidation,
    createFieldValidation,
    createPricingValidation,
    createBookingValidation,
    createMatchPostValidation,
    createReviewValidation,
};
