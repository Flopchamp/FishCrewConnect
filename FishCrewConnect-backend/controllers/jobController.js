const db = require('../config/db');

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Boat Owners only)
exports.createJob = async (req, res) => {
    // Ensure the user is a boat_owner
    if (req.user.user_type !== 'boat_owner') {
        return res.status(403).json({ message: 'Forbidden: Only boat owners can post jobs.' });
    }

    const {
        job_title,
        description,
        location,
        payment_details,
        application_deadline, // Expecting YYYY-MM-DD HH:MM:SS format or null
        job_duration,
        status // Optional, defaults to 'open' in DB schema
    } = req.body;

    const user_id = req.user.id; // From authMiddleware

    // Basic validation
    if (!job_title) {
        return res.status(400).json({ message: 'Job title is required.' });
    }

    try {
        const newJob = {
            user_id,
            job_title,
            description: description || null,
            location: location || null,
            payment_details: payment_details || null,
            application_deadline: application_deadline || null,
            job_duration: job_duration || null,
            status: status || 'open' // Default to 'open' if not provided or rely on DB default
        };

        const [result] = await db.query('INSERT INTO jobs SET ?', newJob);
        const jobId = result.insertId;

        // Fetch the newly created job to return it in the response
        const [jobRows] = await db.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);

        if (jobRows.length === 0) {
            // Should not happen if insert was successful
            return res.status(500).json({ message: 'Failed to retrieve created job.' });
        }

        // Send notifications to all fishermen about the new job
        try {
            // Get all users with user_type 'fisherman'
            const [fishermen] = await db.query('SELECT user_id FROM users WHERE user_type = ?', ['fisherman']);
            
            // Create notifications for each fisherman
            if (fishermen.length > 0) {
                const notificationPromises = fishermen.map(fisherman => {                    const notification = {
                        user_id: fisherman.user_id,
                        type: 'new_message',
                        message: `New job posted: "${job_title}" in ${location || 'N/A'}`,
                        link: `/job-details/${jobId}`,
                        is_read: false
                    };
                    
                    return db.query('INSERT INTO notifications SET ?', notification);
                });
                
                // Execute all notification creation promises
                await Promise.all(notificationPromises);
                
                // Emit Socket.IO event for real-time notifications if Socket.IO is available
                if (req.io) {                    fishermen.forEach(fisherman => {
                        req.io.to(fisherman.user_id.toString()).emit('new_notification', {
                            type: 'new_message',
                            message: `New job posted: "${job_title}" in ${location || 'N/A'}`,
                            link: `/job-details/${jobId}`
                        });
                    });
                }
            }
        } catch (notifError) {
            // Log notification error but don't fail the job creation
            console.error('Error sending notifications to fishermen:', notifError);
        }

        res.status(201).json(jobRows[0]);

    } catch (error) {
        console.error('Error creating job:', error);
        // Check for specific MySQL errors if needed, e.g., foreign key constraint
        if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_jobs_users')) {
             return res.status(400).json({ message: 'Invalid user ID for job posting.' });
        }
        res.status(500).json({ message: 'Server error while creating job.' });
    }
};

// Add other job-related controller functions here later (e.g., getJobs, getJobById, updateJob, deleteJob)

// @desc    Get all job postings
// @route   GET /api/jobs
// @access  Public
exports.getAllJobs = async (req, res) => {
    try {
        // For now, fetch all jobs. Later, you might add pagination, filtering by status='open', etc.
        const [jobs] = await db.query('SELECT * FROM jobs ORDER BY created_at DESC');
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching all jobs:', error);
        res.status(500).json({ message: 'Server error while fetching jobs.' });
    }
};

// @desc    Get a single job by its ID
// @route   GET /api/jobs/:jobId
// @access  Public
exports.getJobById = async (req, res) => {
    const { jobId } = req.params;

    try {
        const [jobRows] = await db.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);

        if (jobRows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        res.json(jobRows[0]);
    } catch (error) {
        console.error('Error fetching job by ID:', error);
        // Check if the error is due to an invalid format for jobId (e.g., not a number)
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || error.code === 'WARN_DATA_TRUNCATED') {
            return res.status(400).json({ message: 'Invalid job ID format.' });
        }
        res.status(500).json({ message: 'Server error while fetching job details.' });
    }
};

// @desc    Update a job posting
// @route   PUT /api/jobs/:jobId
// @access  Private (Job Owner only)
exports.updateJob = async (req, res) => {
    const { jobId } = req.params;    const { 
        job_title,
        description,
        // requirements, // Temporarily commented out until database column is added
        location,
        payment_details,
        application_deadline,
        job_duration,
        status 
    } = req.body;
    const userId = req.user.id;

    // Validate status if provided
    if (status !== undefined) {
        const validStatuses = ['open', 'in_progress', 'filled', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` });
        }
    }

    try {
        // First, check if the job exists and if the current user is the owner
        const [jobRows] = await db.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
        if (jobRows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        const job = jobRows[0];
        if (job.user_id !== userId) {
            return res.status(403).json({ message: 'User not authorized to update this job.' });
        }

        // Construct the SET clause for the SQL query dynamically
        let setClauses = [];
        let queryParams = [];        if (job_title !== undefined) { setClauses.push('job_title = ?'); queryParams.push(job_title); }
        if (description !== undefined) { setClauses.push('description = ?'); queryParams.push(description); }
        // TODO: Re-enable when requirements column is added to database
        // if (requirements !== undefined) { setClauses.push('requirements = ?'); queryParams.push(requirements); }
        if (location !== undefined) { setClauses.push('location = ?'); queryParams.push(location); }
        if (payment_details !== undefined) { setClauses.push('payment_details = ?'); queryParams.push(payment_details); }
        if (application_deadline !== undefined) { setClauses.push('application_deadline = ?'); queryParams.push(application_deadline); }
        if (job_duration !== undefined) { setClauses.push('job_duration = ?'); queryParams.push(job_duration); }
        if (status !== undefined) { setClauses.push('status = ?'); queryParams.push(status); }

        if (setClauses.length === 0) {
            return res.status(400).json({ message: 'No fields to update provided.' });
        }

        queryParams.push(jobId); // For the WHERE clause

        const sql = `UPDATE jobs SET ${setClauses.join(', ')}, updated_at = NOW() WHERE job_id = ?`;

        await db.query(sql, queryParams);

        // Fetch the updated job to return
        const [updatedJobRows] = await db.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);        // If status was updated, send notifications to relevant applicants
        if (status && updatedJobRows.length > 0) {
            const updatedJob = updatedJobRows[0];            let notificationMessage = '';
            let applicantNotificationType = 'application_update';
            let applicantsToNotify = [];

            // Fetch job title for notification messages
            const jobTitle = updatedJob.job_title || "the job"; 

            if (status === 'filled') {
                notificationMessage = `The job "${jobTitle}" (ID: ${jobId}) has been filled.`;
                // Notify applicants with pending, shortlisted, or accepted status, excluding the one who got the job if identifiable
                const [relevantApplicants] = await db.query(
                    "SELECT user_id FROM job_applications WHERE job_id = ? AND status IN ('pending', 'shortlisted', 'accepted')", 
                    [jobId]
                );
                applicantsToNotify = relevantApplicants.map(app => app.user_id);            } else if (status === 'completed') {
                notificationMessage = `The job "${jobTitle}" (ID: ${jobId}) has been marked as completed. You can now submit a review!`;
                // Notify the accepted applicant(s)
                const [acceptedApplicants] = await db.query(
                    "SELECT user_id FROM job_applications WHERE job_id = ? AND status = 'accepted'", 
                    [jobId]
                );
                applicantsToNotify = acceptedApplicants.map(app => app.user_id);
            } else if (status === 'cancelled') {
                notificationMessage = `The job "${jobTitle}" (ID: ${jobId}) has been cancelled.`;
                // Notify all applicants who haven't been rejected yet
                const [activeApplicants] = await db.query(
                    "SELECT user_id FROM job_applications WHERE job_id = ? AND status != 'rejected'", 
                    [jobId]
                );
                applicantsToNotify = activeApplicants.map(app => app.user_id);
            }

            if (notificationMessage && applicantsToNotify.length > 0) {
                for (const applicantId of applicantsToNotify) {
                    // Avoid notifying the job owner if they are also in the list (edge case, shouldn't happen for applicants)
                    if (applicantId === userId) continue;
                    
                    const notificationLink = `/(tabs)/my-applications`; // or a link to the specific job/application
                    const [notifResult] = await db.query(
                        "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)",
                        [applicantId, applicantNotificationType, notificationMessage, notificationLink]
                    );

                    // Emit Socket.IO event
                    if (req.io && notifResult.insertId) {
                        const [newNotif] = await db.query("SELECT * FROM notifications WHERE id = ?", [notifResult.insertId]);
                        if (newNotif.length > 0) {
                            req.io.to(applicantId.toString()).emit('new_notification', newNotif[0]);
                        }
                    }
                }
            }
        }
        
        res.json(updatedJobRows[0]);

    } catch (error) {
        console.error('Error updating job:', error);
        // Check for specific MySQL errors if needed
        if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('fk_jobs_users')) {
             return res.status(400).json({ message: 'Invalid user ID for job posting.' });
        }
        res.status(500).json({ message: 'Server error while updating job.' });
    }
};

// @desc    Delete a job posting
// @route   DELETE /api/jobs/:jobId
// @access  Private (Job Owner only)
exports.deleteJob = async (req, res) => {
    const { jobId } = req.params;
    const userId = req.user.id;

    try {
        // Check if the job exists and if the current user is the owner
        const [jobRows] = await db.query('SELECT * FROM jobs WHERE job_id = ?', [jobId]);
        if (jobRows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        const job = jobRows[0];
        if (job.user_id !== userId) {
            return res.status(403).json({ message: 'User not authorized to delete this job.' });
        }

        // Delete the job
        await db.query('DELETE FROM jobs WHERE job_id = ?', [jobId]);

        // Optionally, you can also delete related applications, notifications, etc.
        // await db.query('DELETE FROM job_applications WHERE job_id = ?', [jobId]);
        // await db.query('DELETE FROM notifications WHERE job_id = ?', [jobId]);        res.json({ message: 'Job deleted successfully.' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Server error while deleting job.' });
    }
};

// @desc    Get all jobs created by the authenticated boat owner
// @route   GET /api/jobs/my-jobs
// @access  Private (Boat Owners only)
exports.getMyJobs = async (req, res) => {
    const userId = req.user.id;
    
    // Ensure the user is a boat_owner
    if (req.user.user_type !== 'boat_owner') {
        return res.status(403).json({ message: 'Forbidden: Only boat owners can access their job listings.' });
    }
    
    try {
        // Fetch all jobs created by the current user
        const [jobRows] = await db.query(
            'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', 
            [userId]
        );
        
        // Add application count to each job
        for (let job of jobRows) {
            const [applicationCount] = await db.query(
                'SELECT COUNT(*) as count FROM job_applications WHERE job_id = ?',
                [job.job_id]
            );
            job.application_count = applicationCount[0].count;
        }
        
        res.json(jobRows);
    } catch (error) {
        console.error('Error fetching user jobs:', error);
        res.status(500).json({ message: 'Server error while fetching jobs.' });
    }
};