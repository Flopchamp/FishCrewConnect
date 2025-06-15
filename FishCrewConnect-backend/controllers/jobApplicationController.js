const db = require('../config/db');

// @desc    Apply for a job
// @route   POST /api/applications/job/:jobId
// @access  Private (Crew members)
exports.applyForJob = async (req, res) => {
    const { jobId } = req.params;
    const userId = req.user.id; // Assuming user ID is available from authMiddleware
    
    // Make cover_letter optional with default empty string
    const cover_letter = req.body && req.body.cover_letter ? req.body.cover_letter : '';

    // Check if user is a crew member (or fisherman, adjust as needed)
    if (req.user.user_type !== 'crew' && req.user.user_type !== 'fisherman') {
        return res.status(403).json({ message: 'Only crew members or fishermen can apply for jobs' });
    }

    try {
        // Check if the job exists and is open
        const [jobRows] = await db.query("SELECT status FROM jobs WHERE job_id = ?", [jobId]);
        if (jobRows.length === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }
        if (jobRows[0].status !== 'open') {
            return res.status(400).json({ message: 'This job is no longer open for applications' });
        }

        // Check if user has already applied
        const [applicationRows] = await db.query(
            "SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?",
            [jobId, userId]
        );
        if (applicationRows.length > 0) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        const [result] = await db.query(
            "INSERT INTO job_applications (job_id, user_id, cover_letter) VALUES (?, ?, ?)",
            [jobId, userId, cover_letter]
        );
        const [newApplication] = await db.query("SELECT * FROM job_applications WHERE id = ?", [result.insertId]);

        // Create a notification for the boat owner
        const [jobOwnerResult] = await db.query("SELECT user_id, job_title FROM jobs WHERE job_id = ?", [jobId]); // Also fetch job_title
        if (jobOwnerResult.length > 0) {
            const jobOwnerId = jobOwnerResult[0].user_id;
            const jobTitle = jobOwnerResult[0].job_title;
            const notificationMessage = `You have a new application for your job \"${jobTitle}\".`;
            const notificationType = 'new_application';
            const notificationLink = `/jobs/${jobId}/applications`;

            const [notifResult] = await db.query(
                "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)",
                [jobOwnerId, notificationType, notificationMessage, notificationLink]
            );
            
            // Emit Socket.IO event
            if (req.io && notifResult.insertId) {
                const [newNotif] = await db.query("SELECT * FROM notifications WHERE id = ?", [notifResult.insertId]);
                if (newNotif.length > 0) {
                    req.io.to(jobOwnerId.toString()).emit('new_notification', newNotif[0]);
                }
            }
        }

        res.status(201).json(newApplication[0]);
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(500).json({ message: 'Server error while applying for job' });
    }
};

// @desc    Get all applications for a specific job (for boat owner)
// @route   GET /api/applications/job/:jobId
// @access  Private (Boat owner of the job)
exports.getApplicationsForJob = async (req, res) => {
    const { jobId } = req.params;
    const ownerId = req.user.id;
    
    console.log(`Getting applications for job ID: ${jobId}, requested by owner ID: ${ownerId}`);

    try {
        // Verify the job exists and belongs to the requesting boat owner
        const [jobRows] = await db.query("SELECT user_id, job_title FROM jobs WHERE job_id = ?", [jobId]);
        console.log('Job query result:', jobRows);
        
        if (jobRows.length === 0) {
            console.log(`Job with ID ${jobId} not found`);
            return res.status(404).json({ message: 'Job not found' });
        }
        
        if (jobRows[0].user_id !== ownerId) {
            console.log(`Authorization error: Job belongs to user ${jobRows[0].user_id}, not requester ${ownerId}`);
            return res.status(403).json({ message: 'You are not authorized to view applications for this job' });
        }// Get applications with user details including profile information
        const [applications] = await db.query(
            `SELECT ja.*, 
                    u.name as applicant_name, 
                    u.email as applicant_email,
                    p.experience_years,
                    p.skills,
                    p.bio,
                    p.profile_image_url
            FROM job_applications ja 
            JOIN users u ON ja.user_id = u.user_id 
            LEFT JOIN profiles p ON u.user_id = p.user_id
            WHERE ja.job_id = ? 
            ORDER BY ja.application_date DESC`,
            [jobId]
        );
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching applications for job:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all applications submitted by the current user (crew member)
// @route   GET /api/applications/my
// @access  Private (Crew members)
exports.getMyApplications = async (req, res) => {
    const userId = req.user.id;

    try {
        const [applications] = await db.query(
            "SELECT ja.*, j.job_title, j.location FROM job_applications ja JOIN jobs j ON ja.job_id = j.job_id WHERE ja.user_id = ? ORDER BY ja.application_date DESC",
            [userId]
        );
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching my applications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update application status (for boat owner)
// @route   PUT /api/applications/:applicationId/status
// @access  Private (Boat owner of the job related to the application)
exports.updateApplicationStatus = async (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body; // e.g., 'viewed', 'shortlisted', 'accepted', 'rejected'
    const ownerId = req.user.id;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }
    // Optional: Validate status against ENUM values if desired, though DB will also do this
    const allowedStatuses = ['pending', 'viewed', 'shortlisted', 'accepted', 'rejected'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        // Verify the application exists and the job it belongs to is owned by the requester
        const [appRows] = await db.query(
            "SELECT ja.id, ja.job_id, ja.user_id AS applicant_id, j.user_id as job_owner_id, j.job_title FROM job_applications ja JOIN jobs j ON ja.job_id = j.job_id WHERE ja.id = ?",
            [applicationId]
        );

        if (appRows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        if (appRows[0].job_owner_id !== ownerId) {
            return res.status(403).json({ message: 'You are not authorized to update this application' });
        }

        await db.query("UPDATE job_applications SET status = ? WHERE id = ?", [status, applicationId]);

        // If the application status is set to 'accepted', update the job status to 'in_progress'
        if (status === 'accepted') {
            const jobId = appRows[0].job_id;
            await db.query("UPDATE jobs SET status = 'in_progress' WHERE job_id = ?", [jobId]);
        }

        // Create a notification for the applicant
        const applicantId = appRows[0].applicant_id;
        const jobTitle = appRows[0].job_title;
        let notificationMessage = `Your application for the job \"${jobTitle}\" has been updated to ${status}.`;
        if (status === 'accepted') {
            notificationMessage = `Congratulations! Your application for the job \"${jobTitle}\" has been accepted.`;
        } else if (status === 'rejected') {
            notificationMessage = `We regret to inform you that your application for the job \"${jobTitle}\" has been rejected.`;
        }
        const notificationType = 'application_status_update';
        const notificationLink = `/my-applications`;
        
        const [notifResult] = await db.query(
            "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)",
            [applicantId, notificationType, notificationMessage, notificationLink]
        );        // Emit Socket.IO event
        if (req.io && notifResult.insertId) {
            const [newNotif] = await db.query("SELECT * FROM notifications WHERE id = ?", [notifResult.insertId]);
            if (newNotif.length > 0) {
                // Add the application_id to the notification for front-end tracking
                const notificationWithAppId = {
                    ...newNotif[0],
                    application_id: applicationId
                };
                req.io.to(applicantId.toString()).emit('new_notification', notificationWithAppId);
            }
        }

        const [updatedApplication] = await db.query("SELECT * FROM job_applications WHERE id = ?", [applicationId]);
        res.status(200).json(updatedApplication[0]);
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
