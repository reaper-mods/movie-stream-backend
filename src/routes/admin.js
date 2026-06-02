const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateAdmin, requireAdminRole } = require('../middleware/adminAuth');
const { adminBruteForceProtection } = require('../middleware/security');

// Admin login (with brute force protection)
router.post('/login', adminBruteForceProtection, AdminController.login);

// Protected admin routes
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Movie management
router.post('/movies', requireAdminRole(['admin', 'superadmin']), AdminController.addMovie);
router.put('/movies/:id', requireAdminRole(['admin', 'superadmin']), AdminController.updateMovie);
router.delete('/movies/:id', requireAdminRole(['admin', 'superadmin']), AdminController.deleteMovie);

// User management
router.get('/users', requireAdminRole(['admin', 'superadmin']), AdminController.getUsers);

// Admin management (only superadmin)
router.post('/create-admin', requireAdminRole(['superadmin']), AdminController.createAdmin);

module.exports = router;