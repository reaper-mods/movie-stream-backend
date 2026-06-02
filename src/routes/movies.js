const express = require('express');
const router = express.Router();
const MovieController = require('../controllers/movieController');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

// Public routes (optional auth for better UX)
router.get('/', optionalAuth, MovieController.getMovies);
router.get('/:id', authenticateUser, MovieController.getMovieById);

// Protected routes
router.get('/user/history', authenticateUser, MovieController.getWatchHistory);

module.exports = router;