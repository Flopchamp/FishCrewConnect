const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// All admin routes require authentication
router.use(authMiddleware);

// Get admin dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

// Get user management statistics
router.get('/users/stats', adminController.getUserStats);

module.exports = router;
