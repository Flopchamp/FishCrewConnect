const db = require('../config/db');

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get total users count
        const [totalUsersResult] = await db.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = totalUsersResult[0].count;

        // Get users breakdown by type
        const [userBreakdownResult] = await db.query(`
            SELECT user_type, COUNT(*) as count 
            FROM users 
            GROUP BY user_type
        `);

        // Get total jobs count
        const [totalJobsResult] = await db.query('SELECT COUNT(*) as count FROM jobs');
        const totalJobs = totalJobsResult[0].count;

        // Get jobs breakdown by status
        const [jobStatusResult] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM jobs 
            GROUP BY status
        `);

        // Get total job applications count
        const [totalApplicationsResult] = await db.query('SELECT COUNT(*) as count FROM job_applications');
        const totalApplications = totalApplicationsResult[0].count;

        // Get active conversations count (unique user pairs)
        const [conversationsResult] = await db.query(`
            SELECT COUNT(DISTINCT CONCAT(LEAST(sender_id, recipient_id), '-', GREATEST(sender_id, recipient_id))) as count
            FROM messages
        `);
        const activeConversations = conversationsResult[0].count;

        // Get recent activity stats
        const [recentUsersResult] = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recentUsers = recentUsersResult[0].count;        const [recentJobsResult] = await db.query(`
            SELECT COUNT(*) as count 
            FROM jobs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recentJobs = recentJobsResult[0].count;
        
        // Get messages sent in last 30 days
        const [recentMessagesResult] = await db.query(`
            SELECT COUNT(*) as count 
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const recentMessages = recentMessagesResult[0].count;

        const stats = {
            overview: {
                totalUsers,
                totalJobs,
                totalApplications,
                activeConversations
            },
            userBreakdown: userBreakdownResult,
            jobStatus: jobStatusResult,
            recentActivity: {
                newUsers: recentUsers,
                newJobs: recentJobs,
                messagesSent: recentMessages
            }
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error while fetching statistics' });
    }
};

// Get user management statistics
exports.getUserStats = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get detailed user statistics
        const [userStats] = await db.query(`
            SELECT 
                user_type,
                COUNT(*) as total,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_this_month            FROM users 
            GROUP BY user_type
        `);
        
        // Get most active users (by job applications or jobs posted)
        const [activeUsers] = await db.query(`
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.user_type,
                u.created_at,
                COALESCE(job_count.jobs_posted, 0) as jobs_posted,
                COALESCE(app_count.applications_made, 0) as applications_made
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as jobs_posted
                FROM jobs
                GROUP BY user_id
            ) job_count ON u.user_id = job_count.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as applications_made
                FROM job_applications
                GROUP BY user_id
            ) app_count ON u.user_id = app_count.user_id
            ORDER BY (COALESCE(job_count.jobs_posted, 0) + COALESCE(app_count.applications_made, 0)) DESC
            LIMIT 10
        `);

        res.json({
            userTypeStats: userStats,
            mostActiveUsers: activeUsers
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Internal server error while fetching user statistics' });
    }
};
