const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/adminAuth');
const { adminBruteForceProtection } = require('../middleware/security');

// Admin login (with brute force protection) - NO AUTH REQUIRED
router.post('/login', adminBruteForceProtection, AdminController.login);

// All routes below require admin authentication
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Movie management
router.post('/movies', AdminController.addMovie);
router.get('/movies', AdminController.getMovies);
router.put('/movies/:id', AdminController.updateMovie);
router.delete('/movies/:id', AdminController.deleteMovie);

// User management
router.get('/users', AdminController.getUsers);

module.exports = router;
