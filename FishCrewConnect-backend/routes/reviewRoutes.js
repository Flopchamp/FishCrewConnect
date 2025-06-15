const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private (Authenticated users meeting criteria)
router.post('/', authMiddleware, reviewController.createReview);

// @route   GET /api/reviews/user/:userId
// @desc    Get all reviews for a specific user
// @access  Public
router.get('/user/:userId', reviewController.getReviewsForUser);

// @route   GET /api/reviews/job/:jobId
// @desc    Get all reviews related to a specific job
// @access  Public
router.get('/job/:jobId', reviewController.getReviewsForJob);

module.exports = router;
