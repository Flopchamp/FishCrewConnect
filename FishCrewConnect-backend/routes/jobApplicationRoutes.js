const express = require('express');
const router = express.Router();
const jobApplicationController = require('../controllers/jobApplicationController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadCV, handleUploadError } = require('../middleware/uploadMiddleware');

// @route   POST /api/applications/job/:jobId
// @desc    Apply for a specific job with CV upload
// @access  Private (Crew members/Fishermen)
router.post('/job/:jobId', authMiddleware, uploadCV, handleUploadError, jobApplicationController.applyForJob);

// @route   GET /api/applications/job/:jobId
// @desc    Get all applications for a specific job (for boat owner)
// @access  Private (Boat owner of the job)
router.get('/job/:jobId', authMiddleware, jobApplicationController.getApplicationsForJob);

// @route   GET /api/applications/my
// @desc    Get all applications submitted by the current user
// @access  Private (Authenticated user)
router.get('/my', authMiddleware, jobApplicationController.getMyApplications);

// @route   PUT /api/applications/:applicationId/status
// @desc    Update the status of an application (for boat owner)
// @access  Private (Boat owner of the job related to the application)
router.put('/:applicationId/status', authMiddleware, jobApplicationController.updateApplicationStatus);

// @route   GET /api/applications/:applicationId/download-cv
// @desc    Download CV file for an application
// @access  Private (Boat owner of the job or the applicant themselves)
router.get('/:applicationId/download-cv', authMiddleware, jobApplicationController.downloadCV);

module.exports = router;
