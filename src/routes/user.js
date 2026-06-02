const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const UserController = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

// All routes require authentication
router.use(authenticateUser);

// Get user profile
router.get('/profile', UserController.getProfile);

// Update user profile
router.put('/profile', [
  body('name').optional().trim().isLength({ max: 100 }).escape(),
  body('email').optional().isEmail().normalizeEmail(),
  ValidationMiddleware.validate,
], UserController.updateProfile);

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ValidationMiddleware.validate,
], UserController.changePassword);

// Get watch history
router.get('/watch-history', UserController.getWatchHistory);

// Update watch progress
router.put('/watch-progress/:movieId', [
  param('movieId').isUUID(4).withMessage('Invalid movie ID'),
  body('progress')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('completed').optional().isBoolean(),
  ValidationMiddleware.validate,
], UserController.updateWatchProgress);

// Delete account
router.delete('/account', UserController.deleteAccount);

module.exports = router;