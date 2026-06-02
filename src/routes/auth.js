const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const ValidationMiddleware = require('../middleware/validation');

// Register
router.post('/register', ValidationMiddleware.registerValidation(), AuthController.register);

// Login (with rate limiting)
router.post('/login', 
  authLimiter, 
  ValidationMiddleware.loginValidation(),
  AuthController.login
);

// Refresh token
router.post('/refresh-token', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ValidationMiddleware.validate,
], AuthController.refreshToken);

// Logout
router.post('/logout', authenticateUser, AuthController.logout);

module.exports = router;