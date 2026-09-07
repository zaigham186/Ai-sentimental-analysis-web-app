const { body, validationResult } = require('express-validator');

/**
 * Participant Validation Rules
 * Using express-validator for backend validation
 */

/**
 * Consent validation rules
 */
const consentValidation = [
  body('consentGiven')
    .isBoolean()
    .withMessage('Consent must be a boolean')
    .equals('true')
    .withMessage('Consent must be given to proceed'),
  
  body('agreedToDataUse')
    .isBoolean()
    .withMessage('Data use agreement must be a boolean')
    .equals('true')
    .withMessage('Must agree to data use'),
  
  body('agreedToWithdrawalTerms')
    .isBoolean()
    .withMessage('Withdrawal terms agreement must be a boolean')
    .equals('true')
    .withMessage('Must agree to withdrawal terms'),
  
  body('electronicSignature')
    .trim()
    .notEmpty()
    .withMessage('Electronic signature is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Electronic signature must be 2-100 characters')
];

/**
 * Registration validation rules
 */
const registrationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-z0-9_-]+$/)
    .withMessage('Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .toLowerCase(),
  
  body('age')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender option'),
  
  body('university')
    .trim()
    .notEmpty()
    .withMessage('University is required')
    .isIn(['SBBWU', 'University of Peshawar'])
    .withMessage('Invalid university'),
  
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be 2-100 characters')
];

/**
 * Validate results
 * Middleware to check validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  consentValidation,
  registrationValidation,
  validate
};
