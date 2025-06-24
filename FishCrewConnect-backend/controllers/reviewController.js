const db = require('../config/db');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (Authenticated users who meet criteria)
exports.createReview = async (req, res) => {
    const reviewer_id = req.user.id; // ID of the logged-in user submitting the review
    const { job_id, reviewed_user_id, rating, comment } = req.body;

    if (!job_id || !reviewed_user_id || rating === undefined) {
        return res.status(400).json({ message: 'Job ID, reviewed user ID, and rating are required.' });
    }

    if (parseInt(rating, 10) < 1 || parseInt(rating, 10) > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    if (reviewer_id === parseInt(reviewed_user_id, 10)) {
        return res.status(400).json({ message: 'Users cannot review themselves.' });
    }

    try {
        // Fetch user types for reviewer and reviewed user
        const [users] = await db.query("SELECT user_id, user_type FROM users WHERE user_id IN (?, ?)", [reviewer_id, reviewed_user_id]);
        const reviewer = users.find(u => u.user_id === reviewer_id);
        const reviewedUser = users.find(u => u.user_id === parseInt(reviewed_user_id, 10));

        if (!reviewer || !reviewedUser) {
            return res.status(404).json({ message: 'Reviewer or reviewed user not found.' });
        }

        // Enforce: Boat owner and fisherman can rate each other
        const validInteraction = 
            (reviewer.user_type === 'boat_owner' && reviewedUser.user_type === 'fisherman') ||
            (reviewer.user_type === 'fisherman' && reviewedUser.user_type === 'boat_owner');

        if (!validInteraction) {
            return res.status(403).json({ message: 'Users of these types cannot review each other.' });
        }

        // Fetch job details (including owner and status)
        const [jobDetails] = await db.query("SELECT user_id, status FROM jobs WHERE job_id = ?", [job_id]);

        if (jobDetails.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        // Check if the job is completed before allowing a review
        if (jobDetails[0].status !== 'completed') {
            return res.status(403).json({ message: 'Reviews can only be submitted for completed jobs.' });
        }

        const jobOwnerId = jobDetails[0].user_id;

        // Refined Interaction Validation:
        // Ensure the fisherman involved had an 'accepted' application and the boat owner is the job owner.
        if (reviewer.user_type === 'boat_owner' && reviewedUser.user_type === 'fisherman') {
            // Case 1: Boat owner (reviewer) is reviewing a fisherman (reviewedUser)
            if (reviewer_id !== jobOwnerId) {
                return res.status(403).json({ message: 'Boat owner can only review fishermen for their own jobs.' });
            }
            const [application] = await db.query(
                "SELECT id FROM job_applications WHERE job_id = ? AND user_id = ? AND status = 'accepted'",
                [job_id, reviewed_user_id] // The fisherman being reviewed
            );
            if (application.length === 0) {
                return res.status(403).json({ message: 'No accepted application found for the reviewed fisherman on this job to justify a review.' });
            }
        } else if (reviewer.user_type === 'fisherman' && reviewedUser.user_type === 'boat_owner') {
            // Case 2: Fisherman (reviewer) is reviewing a boat owner (reviewedUser)
            if (parseInt(reviewed_user_id, 10) !== jobOwnerId) { // Ensure reviewed_user_id is compared as a number if jobOwnerId is a number
                 return res.status(403).json({ message: 'Fisherman can only review the actual owner of the job.' });
            }
            const [application] = await db.query(
                "SELECT id FROM job_applications WHERE job_id = ? AND user_id = ? AND status = 'accepted'",
                [job_id, reviewer_id] // The fisherman submitting the review
            );
            if (application.length === 0) {
                 return res.status(403).json({ message: 'No accepted application found for you on this job to justify a review.' });
            }
        } else {
            // This case should ideally be caught by the 'validInteraction' check earlier,
            // but as a safeguard:
            return res.status(403).json({ message: 'Review conditions not met (user types).' });
        }

        const newReview = {
            job_id,
            reviewer_id,
            reviewed_user_id,
            rating,
            comment: comment || null
        };

        const [result] = await db.query("INSERT INTO reviews SET ?", newReview);
        const [insertedReview] = await db.query("SELECT * FROM reviews WHERE id = ?", [result.insertId]);

        // Create a notification for the user who was reviewed
        const [jobTitleResult] = await db.query("SELECT job_title FROM jobs WHERE job_id = ?", [job_id]);
        const jobTitle = jobTitleResult.length > 0 ? jobTitleResult[0].job_title : "a job";
        
        const [reviewerUser] = await db.query("SELECT name FROM users WHERE user_id = ?", [reviewer_id]);
        const reviewerName = reviewerUser.length > 0 ? reviewerUser[0].name : "Someone";        const notificationMessage = `${reviewerName} left you a review for the job \"${jobTitle}\".`;
        const notificationType = 'new_review';
        const notificationLink = `/(tabs)/profile`;

        const [notifResult] = await db.query(
            "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)",
            [reviewed_user_id, notificationType, notificationMessage, notificationLink]
        );

        // Emit Socket.IO event
        if (req.io && notifResult.insertId) {
            const [newNotif] = await db.query("SELECT * FROM notifications WHERE id = ?", [notifResult.insertId]);
            if (newNotif.length > 0) {
                req.io.to(reviewed_user_id.toString()).emit('new_notification', newNotif[0]);
            }
        }
        
        res.status(201).json(insertedReview[0]);

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'You have already submitted a review for this user regarding this job.' });
        }
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Server error while creating review.' });
    }
};

// @desc    Get all reviews for a specific user
// @route   GET /api/reviews/user/:userId
// @access  Public
exports.getReviewsForUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const [reviews] = await db.query(
            "SELECT r.*, u_reviewer.name as reviewer_name " +
            "FROM reviews r " +
            "JOIN users u_reviewer ON r.reviewer_id = u_reviewer.user_id " +
            "WHERE r.reviewed_user_id = ? ORDER BY r.review_date DESC",
            [userId]
        );
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews for user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all reviews for a specific job
// @route   GET /api/reviews/job/:jobId
// @access  Public
exports.getReviewsForJob = async (req, res) => {
    const { jobId } = req.params;
    try {
        const [reviews] = await db.query(
            "SELECT r.*, u_reviewer.name as reviewer_name, u_reviewed.name as reviewed_user_name " +
            "FROM reviews r " +
            "JOIN users u_reviewer ON r.reviewer_id = u_reviewer.user_id " +
            "JOIN users u_reviewed ON r.reviewed_user_id = u_reviewed.user_id " +
            "WHERE r.job_id = ? ORDER BY r.review_date DESC",
            [jobId]
        );
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews for job:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
