const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/jobs
// @desc    Create a new job posting
// @access  Private (Boat Owners only)
router.post('/', authMiddleware, jobController.createJob);

// @route   GET /api/jobs
// @desc    Get all job postings
// @access  Public
router.get('/', jobController.getAllJobs);

// @route   GET /api/jobs/my-jobs
// @desc    Get all jobs created by the authenticated boat owner
// @access  Private (Boat Owners only)
router.get('/my-jobs', authMiddleware, jobController.getMyJobs);

// @route   GET /api/jobs/:jobId
// @desc    Get a single job by its ID
// @access  Public
router.get('/:jobId', jobController.getJobById);

// @route   PUT /api/jobs/:jobId
// @desc    Update a job posting
// @access  Private (Boat Owner who created the job)
router.put('/:jobId', authMiddleware, jobController.updateJob);

// @route   DELETE /api/jobs/:jobId
// @desc    Delete a job posting
// @access  Private (Boat Owner who created the job)
router.delete('/:jobId', authMiddleware, jobController.deleteJob);

module.exports = router;
