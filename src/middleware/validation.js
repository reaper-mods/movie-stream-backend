const { body, param, query, validationResult } = require('express-validator');

class ValidationMiddleware {
  // Validate results
  static validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }

  // Movie validation rules
  static movieValidation() {
    return [
      body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title must be less than 200 characters')
        .escape(),
      
      body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters')
        .escape(),
      
      body('thumbnailUrl')
        .trim()
        .notEmpty().withMessage('Thumbnail URL is required')
        .isURL().withMessage('Invalid thumbnail URL'),
      
      body('videoUrl')
        .trim()
        .notEmpty().withMessage('Video URL is required')
        .isURL().withMessage('Invalid video URL'),
      
      body('duration')
        .optional()
        .isInt({ min: 1 }).withMessage('Duration must be a positive number'),
      
      body('releaseYear')
        .optional()
        .isInt({ min: 1888, max: new Date().getFullYear() + 5 })
        .withMessage('Invalid release year'),
      
      body('genre')
        .optional()
        .isArray().withMessage('Genre must be an array'),
      
      body('rating')
        .optional()
        .isFloat({ min: 0, max: 10 }).withMessage('Rating must be between 0 and 10'),
      
      body('featured')
        .optional()
        .isBoolean().withMessage('Featured must be a boolean'),
    ];
  }

  // User registration validation
  static registerValidation() {
    return [
      body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
      
      body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
      
      body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name is too long')
        .escape(),
    ];
  }

  // Login validation
  static loginValidation() {
    return [
      body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
      
      body('password')
        .notEmpty().withMessage('Password is required'),
    ];
  }
}

module.exports = ValidationMiddleware;