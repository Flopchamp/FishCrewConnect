const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/users/me
// @desc    Get current logged-in user's profile
// @access  Private
router.get('/me', authMiddleware, userController.getUserProfile);
router.put('/me', authMiddleware, userController.updateUserProfile);

// @route   GET /api/users/contacts
// @desc    Get all users as contacts (excluding current user)
// @access  Private
router.get('/contacts', authMiddleware, userController.getAllContacts);

// @route   GET /api/users/:id/rating
// @desc    Get user's average rating from reviews
// @access  Public
router.get('/:id/rating', userController.getUserRating);

// @route   GET /api/users/:userId/reviews
// @desc    Get all reviews for a specific user
// @access  Public
router.get('/:userId/reviews', reviewController.getReviewsForUser);

// Diagnostic route to test authMiddleware
router.get('/test-auth', authMiddleware, (req, res) => {
  console.log('Accessed /api/users/test-auth. req.user:', req.user);
  if (req.user) {
    res.json({ message: 'Auth middleware seems to be working!', user: req.user });
  } else {
    // This case should ideally be caught by authMiddleware not calling next() or erroring,
    // but as a fallback:
    console.error('/api/users/test-auth reached but req.user is not set!');
    res.status(500).json({ message: 'Server error: req.user not populated by middleware.' });
  }
});

// Add other user-related routes here later, e.g.:
// router.put('/me/update', authMiddleware, userController.updateUserProfile);
// router.get('/:userId', userController.getUserById); // Publicly viewable profile by ID

module.exports = router;
