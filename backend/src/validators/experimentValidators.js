const { body, validationResult } = require('express-validator');

/**
 * Experiment Validators
 * Validates experiment-related request data
 */

/**
 * Video response validation
 */
const experimentResponseValidation = [
  body('responseText')
    .trim()
    .notEmpty().withMessage('Response text is required')
    .isLength({ min: 10 }).withMessage('Response must be at least 10 characters')
    .isLength({ max: 5000 }).withMessage('Response cannot exceed 5000 characters'),

  body('responseTime')
    .optional()
    .isInt({ min: 0 }).withMessage('Response time must be a positive number')
];

/**
 * Validation result middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  experimentResponseValidation,
  validate
};
