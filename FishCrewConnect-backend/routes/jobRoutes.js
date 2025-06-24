const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkJobPostingEnabled } = require('../middleware/settingsMiddleware');

router.post('/', authMiddleware, checkJobPostingEnabled, jobController.createJob);
router.get('/', jobController.getAllJobs);
router.get('/my-jobs', authMiddleware, jobController.getMyJobs);
router.get('/:jobId', jobController.getJobById);
router.put('/:jobId', authMiddleware, checkJobPostingEnabled, jobController.updateJob);
router.delete('/:jobId', authMiddleware, jobController.deleteJob);

module.exports = router;
