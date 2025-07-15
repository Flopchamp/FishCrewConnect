const db = require('../config/db');
const { clearSettingsCache } = require('../middleware/settingsMiddleware');
const { refreshPaymentStatistics } = require('../scripts/update-payment-statistics');

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get total number of users
        const [userCount] = await db.query('SELECT COUNT(*) as total FROM users');
        
        // Get total number of jobs
        const [jobCount] = await db.query('SELECT COUNT(*) as total FROM jobs');
          // Get total number of job applications
        const [applicationCount] = await db.query('SELECT COUNT(*) as total FROM job_applications');
          // Get total number of active conversations (unique sender-recipient pairs)
        const [conversationCount] = await db.query(`
            SELECT COUNT(DISTINCT LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) as total 
            FROM messages
        `);
        
        // Get total number of messages
        const [messageCount] = await db.query('SELECT COUNT(*) as total FROM messages');
        
        // Get recent user registrations (last 7 days)
        const [recentUsers] = await db.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // Get recent job postings (last 7 days)
        const [recentJobs] = await db.query(`
            SELECT COUNT(*) as count 
            FROM jobs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
          // Get recent applications (last 7 days)
        const [recentApplications] = await db.query(`
            SELECT COUNT(*) as count 
            FROM job_applications 
            WHERE application_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
        
        // Get recent messages (last 7 days)
        const [recentMessages] = await db.query(`
            SELECT COUNT(*) as count 
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);
          // Get active conversations (last 30 days) - unique sender-recipient pairs
        const [activeConversations] = await db.query(`
            SELECT COUNT(DISTINCT LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) as count 
            FROM messages 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Get user type distribution
        const [userTypes] = await db.query(`
            SELECT user_type, COUNT(*) as count 
            FROM users 
            GROUP BY user_type
        `);
        
        // Get job status distribution
        const [jobStatuses] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM jobs 
            GROUP BY status
        `);

        // Get payment statistics from payment_statistics table
        const [paymentStats] = await db.query(`
            SELECT 
                total_payments,
                completed_payments,
                pending_payments,
                failed_payments,
                total_payment_volume,
                total_platform_commission,
                average_payment_amount,
                first_payment_date,
                last_payment_date
            FROM payment_statistics 
            LIMIT 1
        `);

        // If payment_statistics table is empty, calculate from job_payments table as fallback
        let paymentData = {};
        if (paymentStats.length > 0) {
            paymentData = paymentStats[0];
        } else {
            const [fallbackStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_payments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_payment_volume,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as total_platform_commission,
                    COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as average_payment_amount,
                    MIN(created_at) as first_payment_date,
                    MAX(created_at) as last_payment_date
                FROM job_payments
            `);
            paymentData = fallbackStats[0];
        }

        res.json({
            totals: {
                users: userCount[0].total,
                jobs: jobCount[0].total,
                applications: applicationCount[0].total,
                conversations: conversationCount[0].total,
                messages: messageCount[0].total
            },
            recent: {
                users: recentUsers[0].count,
                jobs: recentJobs[0].count,
                applications: recentApplications[0].count,
                messages: recentMessages[0].count
            },
            active: {
                conversations: activeConversations[0].count
            },
            payments: paymentData,
            distributions: {
                userTypes,
                jobStatuses
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error while fetching dashboard statistics' });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get user registration trends (last 30 days)
        const [userTrends] = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as registrations
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Get user type breakdown
        const [userTypeStats] = await db.query(`
            SELECT user_type, COUNT(*) as total
            FROM users 
            GROUP BY user_type
        `);

        // Get active users (users who have logged in within last 7 days)
        // Note: This assumes you have a last_login field, if not, we'll use created_at
        const [activeUsers] = await db.query(`
            SELECT COUNT(*) as active_count
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        res.json({
            trends: userTrends,
            userTypes: userTypeStats,
            activeUsers: activeUsers[0].active_count
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Internal server error while fetching user statistics' });
    }
};

// Get all users with pagination


// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { id } = req.params;        const [users] = await db.query(`
            SELECT user_id, name, email, user_type, account_status as status, contact_number, organization_name, created_at
            FROM users 
            WHERE user_id = ?
        `, [id]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's job count
        const [jobCount] = await db.query('SELECT COUNT(*) as total FROM jobs WHERE user_id = ?', [id]);
        
        // Get user's application count
        const [applicationCount] = await db.query('SELECT COUNT(*) as total FROM job_applications WHERE user_id = ?', [id]);

        const user = users[0];
        user.jobCount = jobCount[0].total;
        user.applicationCount = applicationCount[0].total;

        res.json(user);
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        res.status(500).json({ message: 'Internal server error while fetching user details' });
    }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { id } = req.params;
        const { status, reason } = req.body;

        // Validate status
        const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Don't allow changing admin status by other admins (safety measure)
        const [targetUser] = await db.query('SELECT user_type FROM users WHERE user_id = ?', [id]);
        if (targetUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser[0].user_type === 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Cannot modify other admin accounts' });
        }

        // Update user status
        await db.query('UPDATE users SET account_status = ? WHERE user_id = ?', [status, id]);

        // Log the action
        const action = `User status changed to ${status}`;
        console.log(`Admin ${req.user.id} performed ${action} on user ${id}. Reason: ${reason || 'No reason provided'}`);

        res.json({ 
            message: `User status updated to ${status} successfully`,
            status,
            reason
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Internal server error while updating user status' });
    }
};

// Suspend user
exports.suspendUser = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;
        const { reason, duration } = req.body; // duration in days

        // Don't allow suspending admin users
        const [targetUser] = await db.query('SELECT user_type FROM users WHERE user_id = ?', [userId]);
        if (targetUser.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser[0].user_type === 'admin') {
            return res.status(403).json({ message: 'Cannot suspend admin accounts' });
        }

        // Calculate suspension end date
        const suspensionEnd = duration ? new Date(Date.now() + (duration * 24 * 60 * 60 * 1000)) : null;

        // Update user status to suspended
        await db.query('UPDATE users SET account_status = ? WHERE user_id = ?', ['suspended', userId]);

        // Record suspension in admin_actions table
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            'USER_SUSPENSION',
            `Suspended user for: ${reason}`,
            'user',
            userId,
            JSON.stringify({ reason, duration, suspensionEnd })
        ]);

        console.log(`Admin ${req.user.id} suspended user ${userId}. Reason: ${reason || 'No reason provided'}`);

        res.json({ 
            message: 'User suspended successfully',
            suspensionEnd,
            reason
        });
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ message: 'Internal server error while suspending user' });
    }
};

// Unsuspend user
exports.unsuspendUser = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;
        const { reason } = req.body;

        // Update user status to active
        await db.query('UPDATE users SET account_status = ? WHERE user_id = ?', ['active', userId]);

        // Record unsuspension in admin_actions table
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            'USER_UNSUSPENSION',
            `Unsuspended user: ${reason}`,
            'user',
            userId,
            JSON.stringify({ reason })
        ]);

        console.log(`Admin ${req.user.id} unsuspended user ${userId}. Reason: ${reason || 'No reason provided'}`);

        res.json({ 
            message: 'User unsuspended successfully',
            reason
        });
    } catch (error) {
        console.error('Error unsuspending user:', error);
        res.status(500).json({ message: 'Internal server error while unsuspending user' });
    }
};

// Get user suspension history
exports.getUserSuspensionHistory = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;

        const [history] = await db.query(`
            SELECT 
                aa.action_type,
                aa.action_description,
                aa.details,
                aa.created_at,
                u.name as admin_name
            FROM admin_actions aa
            JOIN users u ON aa.admin_id = u.user_id
            WHERE aa.target_type = 'user' 
            AND aa.target_id = ?
            AND aa.action_type IN ('USER_SUSPENSION', 'USER_UNSUSPENSION')
            ORDER BY aa.created_at DESC
        `, [userId]);

        res.json(history);
    } catch (error) {
        console.error('Error fetching user suspension history:', error);
        res.status(500).json({ message: 'Internal server error while fetching suspension history' });
    }
};

// Get all jobs for admin review
exports.getAllJobs = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';

        let whereClause = '';
        let queryParams = [];

        // Add status filter
        if (status && status !== 'all') {
            whereClause = ' WHERE j.status = ?';
            queryParams.push(status);
        }

        // Add search functionality
        if (search) {
            if (whereClause) {
                whereClause += ' AND (j.job_title LIKE ? OR j.description LIKE ? OR u.name LIKE ?)';
            } else {
                whereClause = ' WHERE (j.job_title LIKE ? OR j.description LIKE ? OR u.name LIKE ?)';
            }
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Get total count
        const [totalCount] = await db.query(`SELECT COUNT(*) as total FROM jobs j${whereClause}`, queryParams);        // Get jobs with user information
        const [jobs] = await db.query(`
            SELECT 
                j.job_id,
                j.job_title,
                j.description,
                j.location,
                j.payment_details,
                j.job_duration,
                j.application_deadline,
                j.status,
                j.created_at,
                u.name as posted_by,
                u.email as employer_email,
                (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = j.job_id) as application_count
            FROM jobs j
            JOIN users u ON j.user_id = u.user_id${whereClause}
            ORDER BY j.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        res.json({
            jobs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount[0].total / limit),
                totalJobs: totalCount[0].total,
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching all jobs:', error);
        res.status(500).json({ message: 'Internal server error while fetching jobs' });
    }
};

// Update job status
exports.updateJobStatus = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }        const { id } = req.params;
        const { status, reason } = req.body;

        // Validate status with explicit string comparison
        let isValidStatus = false;
        const validStatusList = ['open', 'in_progress', 'filled', 'completed', 'cancelled'];
        
        if (typeof status === 'string') {
            const trimmedStatus = status.trim();
            isValidStatus = validStatusList.some(validStatus => validStatus === trimmedStatus);
        }
        
        if (!isValidStatus) {
            return res.status(400).json({ 
                message: `Invalid status. Valid statuses are: ${validStatusList.join(', ')}`,
                received: status,
                receivedType: typeof status,
                validStatuses: validStatusList
            });
        }

        // Use the trimmed status for the update
        const finalStatus = typeof status === 'string' ? status.trim() : status;        // Update job status
        console.log(`Updating job ${id} to status ${finalStatus}`);
        const [updateResult] = await db.query('UPDATE jobs SET status = ? WHERE job_id = ?', [finalStatus, id]);
        
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Log the action - use optional admin action logging
        try {
            const adminId = req.user?.id || req.user?.user_id;
            if (adminId) {
                await db.query(`
                    INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    adminId,
                    'job_status_update',
                    `Updated job status to ${finalStatus}${reason ? `: ${reason}` : ''}`,
                    'job',
                    id,
                    JSON.stringify({ new_status: finalStatus, reason: reason || null })
                ]);
            }
        } catch (logError) {
            console.log('Admin action logging failed (non-critical):', logError.message);
        }        console.log(`Job ${id} status updated successfully to ${finalStatus}`);
        res.json({ 
            message: `Job status updated to ${finalStatus} successfully`,
            status: finalStatus,
            reason
        });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ message: 'Internal server error while updating job status' });
    }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { period = '30', type = 'overview' } = req.query;
        const days = parseInt(period);

        let analyticsData = {};

        if (type === 'overview' || type === 'users') {
            // User growth data
            const [userGrowth] = await db.query(`
                SELECT DATE(created_at) as date, COUNT(*) as users
                FROM users 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            `, [days]);

            // User type breakdown
            const [usersByType] = await db.query(`
                SELECT user_type, COUNT(*) as total
                FROM users 
                GROUP BY user_type
            `);            // Users by month for longer periods
            // For monthly trends, always fetch at least 6 months regardless of selected period
            const monthPeriod = Math.max(days, 180); // At least 6 months (180 days)
            const [usersByMonth] = await db.query(`
                SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as users
                FROM users 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month
            `, [monthPeriod]);

            analyticsData.users = {
                userGrowth,
                usersByType,
                usersByMonth
            };
        }        if (type === 'overview' || type === 'jobs') {
            // Job trends for overview
            const [jobTrends] = await db.query(`
                SELECT status, COUNT(*) as count
                FROM jobs 
                GROUP BY status
            `);            // Detailed job statistics by status with duration info
            const [jobsByStatus] = await db.query(`
                SELECT 
                    status,
                    COUNT(*) as total,
                    AVG(DATEDIFF(CASE 
                        WHEN status IN ('completed', 'filled') THEN updated_at 
                        ELSE NOW() 
                    END, created_at)) as avg_duration_days,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as recent_count
                FROM jobs 
                GROUP BY status
                ORDER BY total DESC
            `, [days]);

            // Jobs by location
            const [jobsByLocation] = await db.query(`
                SELECT 
                    location,
                    COUNT(*) as job_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as filled_count,
                    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count
                FROM jobs 
                WHERE location IS NOT NULL AND location != ''
                GROUP BY location
                ORDER BY job_count DESC
                LIMIT 10
            `);

            // Job creation trends over time
            const [jobCreationTrends] = await db.query(`
                SELECT 
                    DATE(created_at) as date, 
                    COUNT(*) as jobs_created,
                    status
                FROM jobs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at), status
                ORDER BY date, status
            `, [days]);            // Job completion rates and avg time to fill
            const [jobMetrics] = await db.query(`
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
                    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_jobs,
                    AVG(CASE WHEN status = 'completed' THEN DATEDIFF(updated_at, created_at) END) as avg_days_to_complete,
                    MIN(created_at) as earliest_job,
                    MAX(created_at) as latest_job
                FROM jobs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [days]);

            analyticsData.jobs = {
                jobTrends,           // For overview compatibility
                jobsByStatus,        // Detailed status breakdown
                jobsByLocation,      // Location-based analytics
                jobCreationTrends,   // Time-based trends
                jobMetrics: jobMetrics[0] // Overall metrics
            };
        }        if (type === 'overview' || type === 'performance') {
            // Application trends over time
            const [applicationTrends] = await db.query(`
                SELECT DATE(application_date) as date, COUNT(*) as applications
                FROM job_applications 
                WHERE application_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(application_date)
                ORDER BY date
            `, [days]);            // Conversion rates by job status
            const [conversionRates] = await db.query(`
                SELECT 
                    j.status,
                    COUNT(DISTINCT j.job_id) as total_jobs,
                    COUNT(DISTINCT CASE WHEN ja.job_id IS NOT NULL THEN j.job_id END) as jobs_with_applications,
                    AVG(application_counts.app_count) as avg_applications_per_job,
                    COUNT(DISTINCT ja.id) as total_applications
                FROM jobs j
                LEFT JOIN job_applications ja ON j.job_id = ja.job_id
                LEFT JOIN (
                    SELECT job_id, COUNT(*) as app_count
                    FROM job_applications
                    GROUP BY job_id
                ) application_counts ON j.job_id = application_counts.job_id
                GROUP BY j.status
                ORDER BY total_jobs DESC
            `);            // Message activity trends over time
            const [messageActivity] = await db.query(`
                SELECT 
                    DATE(created_at) as date, 
                    COUNT(*) as message_count
                FROM messages 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            `, [days]);

            // Overall message statistics
            const [messageStats] = await db.query(`
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(DISTINCT sender_id) as active_senders,
                    COUNT(DISTINCT recipient_id) as active_recipients,
                    AVG(CHAR_LENGTH(message_text)) as avg_message_length
                FROM messages 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [days]);// Performance metrics and KPIs
            const [performanceMetrics] = await db.query(`
                SELECT 
                    COUNT(DISTINCT j.job_id) as total_jobs_posted,
                    COUNT(DISTINCT ja.id) as total_applications_received,
                    COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.job_id END) as jobs_completed,
                    COUNT(DISTINCT CASE WHEN ja.status = 'accepted' THEN ja.id END) as applications_accepted,
                    AVG(CASE WHEN j.status = 'completed' THEN DATEDIFF(j.updated_at, j.created_at) END) as avg_job_completion_days,
                    AVG(DATEDIFF(ja.application_date, j.created_at)) as avg_days_to_first_application
                FROM jobs j
                LEFT JOIN job_applications ja ON j.job_id = ja.job_id
                WHERE j.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [days]);            // User engagement metrics
            const [engagementMetrics] = await db.query(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN u.user_type = 'fisherman' THEN u.user_id END) as active_fishermen,
                    COUNT(DISTINCT CASE WHEN u.user_type = 'boat_owner' THEN u.user_id END) as active_boat_owners,
                    COUNT(DISTINCT CASE WHEN ja.application_date >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN ja.user_id END) as users_applied,
                    COUNT(DISTINCT CASE WHEN j.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN j.user_id END) as users_posted_jobs
                FROM users u
                LEFT JOIN job_applications ja ON u.user_id = ja.user_id
                LEFT JOIN jobs j ON u.user_id = j.user_id
                WHERE u.created_at <= NOW()
            `, [days, days]);

            analyticsData.performance = {
                applicationTrends,
                conversionRates,
                messageActivity,
                messageStats: messageStats[0],
                performanceMetrics: performanceMetrics[0],
                engagementMetrics: engagementMetrics[0]
            };
        }

        // Create overview section by combining key data
        if (type === 'overview') {
            analyticsData.overview = {
                userGrowth: analyticsData.users?.userGrowth || [],
                jobTrends: analyticsData.jobs?.jobTrends || [],
                applicationTrends: analyticsData.performance?.applicationTrends || []
            };
        }

        res.json(analyticsData);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Internal server error while fetching analytics' });
    }
};

// Get system settings
exports.getSystemSettings = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get system statistics
        const [dbStats] = await db.query(`
            SELECT 
                TABLE_NAME as table_name,
                TABLE_ROWS as table_rows,
                DATA_LENGTH as data_length,
                INDEX_LENGTH as index_length
            FROM information_schema.tables 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY DATA_LENGTH DESC
        `);

        // Get system settings from database
        const [settingsRows] = await db.query(`
            SELECT setting_key, setting_value, setting_type, description 
            FROM system_settings 
            ORDER BY setting_key
        `);

        // Parse settings into categories
        const features = {};
        const limits = {};
        const platform = {
            name: 'FishCrewConnect',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        settingsRows.forEach(setting => {
            let value = setting.setting_value;
            
            // Parse JSON values
            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
            }

            // Categorize settings based on setting key patterns
            if (setting.setting_key.includes('enabled')) {
                features[setting.setting_key] = value;
            } else if (setting.setting_key.includes('max_') || setting.setting_key.includes('limit')) {
                limits[setting.setting_key] = value;
            } else if (setting.setting_key.startsWith('platform_')) {
                if (setting.setting_key === 'platform_name') platform.name = value;
                if (setting.setting_key === 'platform_version') platform.version = value;
                if (setting.setting_key === 'platform_environment') platform.environment = value;
            }
        });

        // Get recent admin actions
        let adminActions = [];
        try {
            const [adminActionsRows] = await db.query(`
                SELECT 
                    aa.action_type,
                    aa.action_description,
                    aa.created_at,
                    u.name as admin_name
                FROM admin_actions aa
                JOIN users u ON aa.admin_id = u.user_id
                ORDER BY aa.created_at DESC
                LIMIT 10
            `);

            adminActions = adminActionsRows.map(action => ({
                action: action.action_description,
                admin: action.admin_name,
                timestamp: action.created_at
            }));
        } catch (error) {
            console.log('Admin actions table may not exist or be empty:', error.message);
            // Provide fallback data
            adminActions = [
                { action: 'System initialized', admin: 'System', timestamp: new Date() },
                { action: 'Settings configured', admin: 'Admin', timestamp: new Date() }
            ];
        }

        // Enhanced database information
        const totalRows = dbStats.reduce((sum, table) => sum + (table.table_rows || 0), 0);
        const totalSize = dbStats.reduce((sum, table) => sum + (table.data_length || 0), 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        // System configuration
        const systemConfig = {
            platform,
            database: {
                name: process.env.MYSQL_DB_NAME || 'fishcrew',
                tables: dbStats.map(table => ({
                    table_name: table.table_name || 'Unknown',
                    table_rows: table.table_rows || 0,
                    table_size_mb: ((table.data_length || 0) / (1024 * 1024)).toFixed(2)
                })),
                totalTables: dbStats.length,
                totalRows: totalRows.toString(),
                totalSizeMB
            },
            features,
            limits
        };

        res.json({
            systemConfig,
            adminActions,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('Error fetching system settings:', error);
        res.status(500).json({ message: 'Internal server error while fetching system settings' });
    }
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { setting, value } = req.body;
        
        // Get user ID - check both possible property names
        const userId = req.user?.id || req.user?.user_id;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID not found in request' });
        }
        
        // Validate setting exists
        const [existingSetting] = await db.query(
            'SELECT * FROM system_settings WHERE setting_key = ?',
            [setting]
        );

        if (existingSetting.length === 0) {
            return res.status(400).json({ message: 'Invalid setting name' });
        }

        // Determine the correct data type and format
        let formattedValue = value;
        const settingType = existingSetting[0].setting_type;

        if (settingType === 'boolean') {
            formattedValue = Boolean(value);
        } else if (settingType === 'number') {
            formattedValue = Number(value);
            if (isNaN(formattedValue)) {
                return res.status(400).json({ message: 'Invalid number value' });
            }
        } else if (settingType === 'json') {
            try {
                formattedValue = typeof value === 'string' ? JSON.parse(value) : value;
            } catch (e) {
                return res.status(400).json({ message: 'Invalid JSON value' });
            }
        }

        // Update the setting in database
        await db.query(
            'UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
            [JSON.stringify(formattedValue), userId, setting]
        );

        // Log the admin action
        await db.query(
            'INSERT INTO admin_actions (admin_id, action_type, action_description, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
            [
                userId,
                'SETTING_UPDATE',
                `Updated system setting: ${setting}`,
                JSON.stringify({ setting, oldValue: existingSetting[0].setting_value, newValue: formattedValue }),
                req.ip,
                req.get('User-Agent') || ''
            ]
        );

        console.log(`Admin ${userId} updated system setting: ${setting} = ${formattedValue}`);

        // Clear settings cache so changes take effect immediately
        clearSettingsCache();

        res.json({ 
            message: `System setting '${setting}' updated successfully`,
            setting,
            value: formattedValue,
            updatedBy: req.user.name,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({ message: 'Internal server error while updating system settings' });
    }
};

// Get admin activity log
exports.getAdminActivityLog = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        try {
            // Get total count
            const [totalCount] = await db.query('SELECT COUNT(*) as total FROM admin_actions');

            // Get admin actions with user information
            const [activities] = await db.query(`
                SELECT 
                    aa.id,
                    aa.action_type,
                    aa.action_description,
                    aa.target_type,
                    aa.target_id,
                    aa.details,
                    aa.created_at,
                    u.name as admin_name
                FROM admin_actions aa
                JOIN users u ON aa.admin_id = u.user_id
                ORDER BY aa.created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            res.json({
                activities,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount[0].total / limit),
                    totalActivities: totalCount[0].total,
                    limit
                }
            });
        } catch (error) {
            console.log('Admin actions table issue:', error.message);
            // Return mock data if table doesn't exist
            const mockActivities = [];
            for (let i = 0; i < Math.min(limit, 10); i++) {
                mockActivities.push({
                    id: i + 1,
                    admin_name: 'System Admin',
                    action_type: ['SETTING_UPDATE', 'USER_UPDATE', 'JOB_UPDATE'][i % 3],
                    action_description: `Administrative action ${i + 1}`,
                    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    details: `{"action": "mock_action_${i + 1}"}`
                });
            }

            res.json({
                activities: mockActivities,
                pagination: {
                    currentPage: page,
                    totalPages: 1,
                    totalActivities: mockActivities.length,
                    limit
                }
            });
        }
    } catch (error) {
        console.error('Error fetching admin activity log:', error);
        res.status(500).json({ message: 'Internal server error while fetching activity log' });
    }
};

// User Verification Management
exports.getPendingUsers = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get all pending users with their verification requests
        const [pendingUsers] = await db.query(`
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.user_type,
                u.contact_number,
                u.organization_name,
                u.created_at,
                u.verification_status,
                uvr.requested_at,
                uvr.request_type,
                uvr.user_message
            FROM users u
            LEFT JOIN user_verification_requests uvr ON u.user_id = uvr.user_id
            WHERE u.verification_status = 'pending'
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            pending_users: pendingUsers,
            count: pendingUsers.length
        });

    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({ message: 'Server error fetching pending users.' });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;
        const { notes } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        // Check if user exists and is pending
        const [users] = await db.query(
            'SELECT user_id, name, email, verification_status FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = users[0];

        if (user.verification_status !== 'pending') {
            return res.status(400).json({ 
                message: `User is already ${user.verification_status}.` 
            });
        }

        // Update user verification status
        await db.query(
            `UPDATE users 
             SET verification_status = 'verified', 
                 verified_by = ?, 
                 verified_at = CURRENT_TIMESTAMP 
             WHERE user_id = ?`,
            [req.user.id, userId]
        );

        // Update verification request status
        await db.query(
            `UPDATE user_verification_requests 
             SET status = 'verified', 
                 processed_by = ?, 
                 processed_at = CURRENT_TIMESTAMP,
                 admin_notes = ?
             WHERE user_id = ? AND status = 'pending'`,
            [req.user.id, notes || null, userId]
        );

        res.json({
            success: true,
            message: `User ${user.name} has been successfully verified.`,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                verification_status: 'verified'
            }
        });

    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({ message: 'Server error verifying user.' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { status, user_type, search, page = 1, limit = 50 } = req.query;
        
        // Build query conditions
        let whereConditions = [];
        let queryParams = [];

        if (status && ['pending', 'verified'].includes(status)) {
            whereConditions.push('u.verification_status = ?');
            queryParams.push(status);
        }

        if (user_type && ['admin', 'boat_owner', 'fisherman'].includes(user_type)) {
            whereConditions.push('u.user_type = ?');
            queryParams.push(user_type);
        }

        if (search && search.trim()) {
            whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
            queryParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';

        // Calculate offset for pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        queryParams.push(parseInt(limit), offset);

        // Get users with verification info
        const [users] = await db.query(`
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.user_type,
                u.contact_number,
                u.organization_name,
                u.created_at,
                u.verification_status,
                u.verified_at,
                u.account_status as status,
                verifier.name as verified_by_name
            FROM users u
            LEFT JOIN users verifier ON u.verified_by = verifier.user_id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, queryParams);

        // Get total count for pagination
        const countParams = queryParams.slice(0, -2); // Remove limit and offset
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `, countParams);

        // Get total counts by type and verification status for filters
        const [typeCounts] = await db.query(`
            SELECT 
                COUNT(*) as all_users,
                SUM(CASE WHEN user_type = 'fisherman' THEN 1 ELSE 0 END) as fisherman,
                SUM(CASE WHEN user_type = 'boat_owner' THEN 1 ELSE 0 END) as boat_owner,
                SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admin,
                SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
            FROM users
        `);

        res.json({
            success: true,
            users: users,
            pagination: {
                current_page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                total_pages: Math.ceil(countResult[0].total / parseInt(limit))
            },
            counts: {
                all: typeCounts[0].all_users,
                fisherman: typeCounts[0].fisherman,
                boat_owner: typeCounts[0].boat_owner,
                admin: typeCounts[0].admin,
                pending: typeCounts[0].pending,
                verified: typeCounts[0].verified
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
};

// =============================================================================
// ADMIN PAYMENT MANAGEMENT METHODS
// =============================================================================

// Get all platform payments (admin only)
exports.getAllPlatformPayments = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { page = 1, limit = 50, status, user_type, search, date_range } = req.query;
        const offset = (page - 1) * limit;

        // Build the query
        let whereClause = '';
        let params = [];
        let conditions = [];

        if (status && status !== 'all') {
            conditions.push('p.status = ?');
            params.push(status);
        }

        if (search) {
            conditions.push('(p.id LIKE ? OR j.job_title LIKE ? OR uf.name LIKE ? OR ub.name LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (date_range && date_range !== 'all') {
            const days = parseInt(date_range);
            if (!isNaN(days)) {
                conditions.push('p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
                params.push(days);
            }
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get payments with user and job details
        const [payments] = await db.query(`
            SELECT 
                p.*,
                j.job_title,
                j.description as job_description,
                uf.name as fisherman_name,
                uf.email as fisherman_email,
                uf.contact_number as fisherman_phone,
                ub.name as boat_owner_name,
                ub.email as boat_owner_email,
                ub.contact_number as boat_owner_phone,
                p.created_at,
                p.updated_at
            FROM job_payments p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN users uf ON p.fisherman_id = uf.user_id
            LEFT JOIN users ub ON p.boat_owner_id = ub.user_id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Get total count for pagination
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM job_payments p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN users uf ON p.fisherman_id = uf.user_id
            LEFT JOIN users ub ON p.boat_owner_id = ub.user_id
            ${whereClause}
        `, params);

        const totalPayments = countResult[0].total;
        const totalPages = Math.ceil(totalPayments / limit);

        res.json({
            payments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_payments: totalPayments,
                per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching platform payments:', error);
        res.status(500).json({ message: 'Internal server error while fetching payments' });
    }
};

// Get payment statistics
exports.getPaymentStatistics = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { date_range = '30' } = req.query;
        const days = parseInt(date_range);

        // Get basic payment statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as disputed_payments,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as total_commission,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as avg_transaction_value
            FROM job_payments 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [days]);

        // Get monthly growth
        const [growthStats] = await db.query(`
            SELECT 
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as current_period,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as previous_period
            FROM job_payments 
            WHERE status = 'completed'
        `, [days, days * 2, days]);

        const currentPeriod = growthStats[0].current_period;
        const previousPeriod = growthStats[0].previous_period;
        const growth = previousPeriod > 0 ? ((currentPeriod - previousPeriod) / previousPeriod * 100) : 0;

        res.json({
            ...stats[0],
            monthly_growth: parseFloat(growth.toFixed(2)),
            commission_rate: 0.15, // This should come from platform settings
            period_days: days
        });

    } catch (error) {
        console.error('Error fetching payment statistics:', error);
        res.status(500).json({ message: 'Internal server error while fetching payment statistics' });
    }
};

// Get payment analytics for charts
exports.getPaymentAnalytics = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { period = '12' } = req.query; // months
        const months = parseInt(period);

        // Get monthly revenue data
        const [monthlyData] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as transaction_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as commission
            FROM job_payments 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `, [months]);

        // Get payment status distribution
        const [statusData] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM job_payments 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY status
        `, [30]); // Last 30 days for status distribution

        // Get user type payment distribution
        const [userTypeData] = await db.query(`
            SELECT 
                'fisherman' as user_type,
                COUNT(*) as payment_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN fisherman_amount END), 0) as total_amount
            FROM job_payments p
            WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status = 'completed'
            UNION ALL
            SELECT 
                'boat_owner' as user_type,
                COUNT(*) as payment_count,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_amount
            FROM job_payments p
            WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status = 'completed'
        `, [30, 30]);

        res.json({
            monthly_revenue: monthlyData,
            status_distribution: statusData,
            user_type_distribution: userTypeData,
            period_months: months
        });

    } catch (error) {
        console.error('Error fetching payment analytics:', error);
        res.status(500).json({ message: 'Internal server error while fetching payment analytics' });
    }
};

// Get payment disputes
exports.getPaymentDisputes = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Note: This assumes you have a payment_disputes table
        // For now, we'll return payments with 'disputed' status
        const [disputes] = await db.query(`
            SELECT 
                p.id as payment_id,
                p.status,
                p.total_amount,
                p.created_at,
                j.job_title,
                uf.name as fisherman_name,
                ub.name as boat_owner_name,
                'payment_dispute' as dispute_type,
                'Disputed payment requiring admin review' as description
            FROM job_payments p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN users uf ON p.fisherman_id = uf.user_id
            LEFT JOIN users ub ON p.boat_owner_id = ub.user_id
            WHERE p.status = 'disputed'
            ORDER BY p.created_at DESC
        `);

        res.json({ disputes });

    } catch (error) {
        console.error('Error fetching payment disputes:', error);
        res.status(500).json({ message: 'Internal server error while fetching payment disputes' });
    }
};

// Resolve payment dispute
exports.resolvePaymentDispute = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { disputeId } = req.params;
        const { resolution, notes } = req.body;

        // For now, disputeId is actually the payment ID
        const paymentId = disputeId;

        // Update payment status based on resolution
        let newStatus = 'completed';
        if (resolution === 'reject_payment') {
            newStatus = 'failed';
        }

        await db.query(`
            UPDATE job_payments 
            SET status = ?, admin_notes = ?, resolved_at = NOW(), resolved_by = ?
            WHERE id = ?
        `, [newStatus, notes || `Dispute resolved: ${resolution}`, req.user.id, paymentId]);

        // Log admin action
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, ip_address, user_agent, created_at)
            VALUES (?, 'resolve_dispute', ?, 'payment', ?, ?, ?, ?, NOW())
        `, [req.user.id, `Resolved dispute: ${resolution}`, paymentId, JSON.stringify({ resolution, newStatus }), req.ip, req.get('User-Agent') || '']);

        res.json({ 
            message: 'Dispute resolved successfully',
            payment_id: paymentId,
            resolution: resolution,
            new_status: newStatus
        });

    } catch (error) {
        console.error('Error resolving payment dispute:', error);
        res.status(500).json({ message: 'Internal server error while resolving dispute' });
    }
};

// Process payment refund
exports.processPaymentRefund = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { paymentId } = req.params;
        const { amount, reason } = req.body;

        // Validate input
        if (!amount || !reason) {
            return res.status(400).json({ message: 'Refund amount and reason are required' });
        }

        // Get payment details
        const [payment] = await db.query(`
            SELECT * FROM job_payments WHERE id = ? AND status = 'completed'
        `, [paymentId]);

        if (payment.length === 0) {
            return res.status(404).json({ message: 'Payment not found or not eligible for refund' });
        }

        const paymentData = payment[0];
        const refundAmount = parseFloat(amount);

        if (refundAmount > parseFloat(paymentData.total_amount)) {
            return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
        }

        // Process refund (in a real system, this would integrate with payment processor)
        await db.query(`
            UPDATE job_payments 
            SET status = 'refunded', refund_amount = ?, refund_reason = ?, refunded_at = NOW(), refunded_by = ?
            WHERE id = ?
        `, [refundAmount, reason, req.user.id, paymentId]);

        // Log admin action
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, ip_address, user_agent, created_at)
            VALUES (?, 'process_refund', ?, 'payment', ?, ?, ?, ?, NOW())
        `, [req.user.id, `Refunded ${refundAmount}: ${reason}`, paymentId, JSON.stringify({ refundAmount, reason }), req.ip, req.get('User-Agent') || '']);

        res.json({ 
            message: 'Refund processed successfully',
            payment_id: paymentId,
            refund_amount: refundAmount,
            reason: reason
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Internal server error while processing refund' });
    }
};

// Reverse payment transaction
exports.reversePayment = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { paymentId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Reason for reversal is required' });
        }

        // Get payment details
        const [payment] = await db.query(`
            SELECT * FROM job_payments WHERE id = ?
        `, [paymentId]);

        if (payment.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Reverse the payment
        await db.query(`
            UPDATE job_payments 
            SET status = 'reversed', reversal_reason = ?, reversed_at = NOW(), reversed_by = ?
            WHERE id = ?
        `, [reason, req.user.id, paymentId]);

        // Log admin action
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, ip_address, user_agent, created_at)
            VALUES (?, 'reverse_payment', ?, 'payment', ?, ?, ?, ?, NOW())
        `, [req.user.id, `Payment reversed: ${reason}`, paymentId, JSON.stringify({ reason }), req.ip, req.get('User-Agent') || '']);

        res.json({ 
            message: 'Payment reversed successfully',
            payment_id: paymentId,
            reason: reason
        });

    } catch (error) {
        console.error('Error reversing payment:', error);
        res.status(500).json({ message: 'Internal server error while reversing payment' });
    }
};

// Get payment configuration
exports.getPaymentConfig = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Get configuration from system_settings table
        const [settings] = await db.query(`
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key LIKE 'payment_%'
        `);

        const config = {
            commissionRate: 0.15,
            minimumPayment: 100,
            maximumPayment: 100000,
            autoApproveLimit: 10000,
            disputeTimeLimit: 30,
            refundTimeLimit: 7
        };

        // Override with database values if they exist
        settings.forEach(setting => {
            switch (setting.setting_key) {
                case 'payment_commission_rate':
                    config.commissionRate = parseFloat(setting.setting_value);
                    break;
                case 'payment_minimum_amount':
                    config.minimumPayment = parseFloat(setting.setting_value);
                    break;
                case 'payment_maximum_amount':
                    config.maximumPayment = parseFloat(setting.setting_value);
                    break;
                case 'payment_auto_approve_limit':
                    config.autoApproveLimit = parseFloat(setting.setting_value);
                    break;
                case 'payment_dispute_time_limit':
                    config.disputeTimeLimit = parseInt(setting.setting_value);
                    break;
                case 'payment_refund_time_limit':
                    config.refundTimeLimit = parseInt(setting.setting_value);
                    break;
            }
        });

        res.json(config);

    } catch (error) {
        console.error('Error fetching payment config:', error);
        res.status(500).json({ message: 'Internal server error while fetching payment configuration' });
    }
};

// Update payment configuration
exports.updatePaymentConfig = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required. Please log in again.' });
        }

        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const {
            commissionRate,
            minimumPayment,
            maximumPayment,
            autoApproveLimit,
            disputeTimeLimit,
            refundTimeLimit
        } = req.body;

        const configMappings = [
            { key: 'payment_commission_rate', value: commissionRate },
            { key: 'payment_minimum_amount', value: minimumPayment },
            { key: 'payment_maximum_amount', value: maximumPayment },
            { key: 'payment_auto_approve_limit', value: autoApproveLimit },
            { key: 'payment_dispute_time_limit', value: disputeTimeLimit },
            { key: 'payment_refund_time_limit', value: refundTimeLimit }
        ];

        // Update each setting
        for (const config of configMappings) {
            if (config.value !== undefined) {
                await db.query(`
                    INSERT INTO system_settings (setting_key, setting_value) 
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                `, [config.key, config.value.toString()]);
            }
        }

        // Log admin action (only if user_id is available)
        if (req.user.id) {
            try {
                await db.query(`
                    INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, ip_address, user_agent, created_at)
                    VALUES (?, 'update_payment_config', ?, 'system', NULL, ?, ?, ?, NOW())
                `, [req.user.id, 'Updated payment configuration settings', JSON.stringify(req.body), req.ip, req.get('User-Agent') || '']);
            } catch (logError) {
                console.error('Error logging admin action:', logError);
                // Don't fail the main operation if logging fails
            }
        }

        res.json({ message: 'Payment configuration updated successfully' });

    } catch (error) {
        console.error('Error updating payment config:', error);
        res.status(500).json({ message: 'Internal server error while updating payment configuration' });
    }
};

// Get user payment history (admin view)
exports.getUserPaymentHistory = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Get payments for the user (both as fisherman and boat owner)
        const [payments] = await db.query(`
            SELECT 
                p.*,
                j.job_title,
                CASE 
                    WHEN p.fisherman_id = ? THEN 'received'
                    WHEN p.boat_owner_id = ? THEN 'sent'
                END as payment_direction,
                CASE 
                    WHEN p.fisherman_id = ? THEN ub.name
                    WHEN p.boat_owner_id = ? THEN uf.name
                END as other_party_name
            FROM job_payments p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN users uf ON p.fisherman_id = uf.user_id
            LEFT JOIN users ub ON p.boat_owner_id = ub.user_id
            WHERE p.fisherman_id = ? OR p.boat_owner_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, userId, userId, userId, userId, userId, parseInt(limit), offset]);

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM job_payments p
            WHERE p.fisherman_id = ? OR p.boat_owner_id = ?
        `, [userId, userId]);

        const totalPayments = countResult[0].total;
        const totalPages = Math.ceil(totalPayments / limit);

        res.json({
            payments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_payments: totalPayments,
                per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching user payment history:', error);
        res.status(500).json({ message: 'Internal server error while fetching user payment history' });
    }
};

// Generate payment report
exports.generatePaymentReport = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { type, date_range = '30', format = 'json' } = req.body;

        // This is a placeholder - in a real system, you'd generate comprehensive reports
        const [reportData] = await db.query(`
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as total_commission
            FROM job_payments 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [parseInt(date_range)]);

        res.json({
            report_type: type,
            generated_at: new Date().toISOString(),
            period_days: parseInt(date_range),
            data: reportData[0],
            format: format
        });

    } catch (error) {
        console.error('Error generating payment report:', error);
        res.status(500).json({ message: 'Internal server error while generating payment report' });
    }
};

// Get commission analytics
exports.getCommissionAnalytics = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { date_range = '30', period = 'daily' } = req.query;
        const days = parseInt(date_range);

        // Daily commission trends
        const [dailyTrends] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COALESCE(SUM(platform_commission), 0) as commission_earned,
                COALESCE(AVG(platform_commission), 0) as avg_commission,
                COALESCE(AVG(total_amount), 0) as avg_transaction_value
            FROM job_payments 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [days]);

        // Monthly commission breakdown (last 12 months)
        const [monthlyBreakdown] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                DATE_FORMAT(created_at, '%M %Y') as month_name,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COALESCE(SUM(platform_commission), 0) as commission_earned,
                COALESCE(AVG(platform_commission), 0) as avg_commission,
                COALESCE(SUM(fisherman_amount), 0) as fisherman_earnings,
                COALESCE(AVG(total_amount), 0) as avg_transaction_value
            FROM job_payments 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%M %Y')
            ORDER BY month DESC
        `);

        // Commission by job type/category (if available)
        const [commissionByCategory] = await db.query(`
            SELECT 
                COALESCE(j.job_duration, 'Not Specified') as job_category,
                COUNT(*) as transaction_count,
                COALESCE(SUM(p.total_amount), 0) as total_volume,
                COALESCE(SUM(p.platform_commission), 0) as commission_earned,
                COALESCE(AVG(p.platform_commission), 0) as avg_commission,
                ROUND((SUM(p.platform_commission) / SUM(p.total_amount)) * 100, 2) as effective_rate
            FROM job_payments p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            WHERE p.status = 'completed' 
                AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY j.job_duration
            ORDER BY commission_earned DESC
        `, [days]);

        // Top commission generating users (boat owners)
        const [topCommissionGenerators] = await db.query(`
            SELECT 
                ub.user_id,
                ub.name as boat_owner_name,
                ub.email as boat_owner_email,
                COUNT(*) as total_payments,
                COALESCE(SUM(p.total_amount), 0) as total_volume,
                COALESCE(SUM(p.platform_commission), 0) as commission_generated,
                COALESCE(AVG(p.platform_commission), 0) as avg_commission_per_payment,
                COALESCE(AVG(p.total_amount), 0) as avg_payment_amount
            FROM job_payments p
            JOIN users ub ON p.boat_owner_id = ub.user_id
            WHERE p.status = 'completed' 
                AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY ub.user_id, ub.name, ub.email
            ORDER BY commission_generated DESC
            LIMIT 10
        `, [days]);

        // Commission rate analysis
        const [rateAnalysis] = await db.query(`
            SELECT 
                CASE 
                    WHEN total_amount < 500 THEN 'Under $500'
                    WHEN total_amount < 1000 THEN '$500 - $999'
                    WHEN total_amount < 2000 THEN '$1000 - $1999'
                    WHEN total_amount < 5000 THEN '$2000 - $4999'
                    ELSE '$5000+'
                END as amount_range,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COALESCE(SUM(platform_commission), 0) as commission_earned,
                ROUND(AVG((platform_commission / total_amount) * 100), 2) as avg_commission_rate
            FROM job_payments 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND total_amount > 0
            GROUP BY 
                CASE 
                    WHEN total_amount < 500 THEN 'Under $500'
                    WHEN total_amount < 1000 THEN '$500 - $999'
                    WHEN total_amount < 2000 THEN '$1000 - $1999'
                    WHEN total_amount < 5000 THEN '$2000 - $4999'
                    ELSE '$5000+'
                END
            ORDER BY MIN(total_amount)
        `, [days]);

        // Overall commission summary
        const [summary] = await db.query(`
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(total_amount), 0) as total_payment_volume,
                COALESCE(SUM(platform_commission), 0) as total_commission_earned,
                COALESCE(AVG(platform_commission), 0) as avg_commission_per_transaction,
                ROUND(AVG((platform_commission / total_amount) * 100), 2) as avg_commission_rate,
                COALESCE(MAX(platform_commission), 0) as highest_commission,
                COALESCE(MIN(platform_commission), 0) as lowest_commission,
                COUNT(DISTINCT boat_owner_id) as unique_boat_owners,
                COUNT(DISTINCT fisherman_id) as unique_fishermen
            FROM job_payments 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND total_amount > 0
        `, [days]);

        res.json({
            summary: summary[0],
            daily_trends: dailyTrends,
            monthly_breakdown: monthlyBreakdown,
            commission_by_category: commissionByCategory,
            top_commission_generators: topCommissionGenerators,
            commission_rate_analysis: rateAnalysis,
            period_days: days,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching commission analytics:', error);
        res.status(500).json({ message: 'Internal server error while fetching commission analytics' });
    }
};

// Override payment status (emergency admin action)
exports.overridePaymentStatus = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { paymentId } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ['pending', 'completed', 'failed', 'disputed', 'refunded', 'reversed'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid payment status' });
        }

        if (!reason) {
            return res.status(400).json({ message: 'Reason for status override is required' });
        }

        // Update payment status
        await db.query(`
            UPDATE job_payments 
            SET status = ?, admin_notes = ?, status_overridden_at = NOW(), status_overridden_by = ?
            WHERE id = ?
        `, [status, reason, req.user.id, paymentId]);

        // Log admin action
        await db.query(`
            INSERT INTO admin_actions (admin_id, action_type, action_description, target_type, target_id, details, ip_address, user_agent, created_at)
            VALUES (?, 'override_payment_status', ?, 'payment', ?, ?, ?, ?, NOW())
        `, [req.user.id, `Status overridden to ${status}: ${reason}`, paymentId, JSON.stringify({ status, reason }), req.ip, req.get('User-Agent') || '']);

        res.json({ 
            message: 'Payment status overridden successfully',
            payment_id: paymentId,
            new_status: status,
            reason: reason
        });

    } catch (error) {
        console.error('Error overriding payment status:', error);
        res.status(500).json({ message: 'Internal server error while overriding payment status' });
    }
};

// Refresh payment statistics (admin utility)
exports.refreshPaymentStatistics = async (req, res) => {
    try {
        // Check if user is an admin
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        console.log('Admin manually refreshing payment statistics...');
        const result = await refreshPaymentStatistics();

        if (result.success) {
            res.json({
                message: 'Payment statistics refreshed successfully',
                statistics: result.statistics
            });
        } else {
            res.status(500).json({
                message: 'Failed to refresh payment statistics',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error refreshing payment statistics:', error);
        res.status(500).json({ message: 'Internal server error while refreshing payment statistics' });
    }
};

// Get user payment analytics (top performers and payment patterns)
exports.getUserPaymentAnalytics = async (req, res) => {
    try {
        // Check if user is an admin (skip check if no user for testing)
        if (req.user && req.user.user_type !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        const { date_range = '30', user_type = 'all', limit = 10 } = req.query;
        const days = parseInt(date_range);
        const maxLimit = parseInt(limit);

        // Top performing fishermen (by earnings)
        const [topFishermen] = await db.query(`
            SELECT 
                uf.user_id,
                uf.name as fisherman_name,
                uf.email as fisherman_email,
                uf.contact_number,
                uf.created_at as member_since,
                COUNT(*) as total_payments_received,
                COALESCE(SUM(p.fisherman_amount), 0) as total_earnings,
                COALESCE(AVG(p.fisherman_amount), 0) as avg_earning_per_job,
                COALESCE(MAX(p.fisherman_amount), 0) as highest_earning,
                COUNT(DISTINCT p.boat_owner_id) as unique_employers,
                ROUND(AVG(DATEDIFF(p.created_at, j.created_at)), 1) as avg_days_to_payment,
                COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments
            FROM job_payments p
            JOIN users uf ON p.fisherman_id = uf.user_id
            LEFT JOIN jobs j ON p.job_id = j.job_id
            WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND uf.user_type = 'fisherman'
            GROUP BY uf.user_id, uf.name, uf.email, uf.contact_number, uf.created_at
            ORDER BY total_earnings DESC
            LIMIT ?
        `, [days, maxLimit]);

        // Top performing boat owners (by payment volume)
        const [topBoatOwners] = await db.query(`
            SELECT 
                ub.user_id,
                ub.name as boat_owner_name,
                ub.email as boat_owner_email,
                ub.contact_number,
                ub.organization_name,
                ub.created_at as member_since,
                COUNT(*) as total_payments_made,
                COALESCE(SUM(p.total_amount), 0) as total_payment_volume,
                COALESCE(SUM(p.platform_commission), 0) as total_commission_paid,
                COALESCE(AVG(p.total_amount), 0) as avg_payment_amount,
                COALESCE(MAX(p.total_amount), 0) as largest_payment,
                COUNT(DISTINCT p.fisherman_id) as unique_fishermen_hired,
                COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments
            FROM job_payments p
            JOIN users ub ON p.boat_owner_id = ub.user_id
            WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND ub.user_type = 'boat_owner'
            GROUP BY ub.user_id, ub.name, ub.email, ub.contact_number, ub.organization_name, ub.created_at
            ORDER BY total_payment_volume DESC
            LIMIT ?
        `, [days, maxLimit]);

        // Payment frequency patterns
        const [paymentFrequency] = await db.query(`
            SELECT 
                user_type,
                user_id,
                name,
                email,
                COUNT(*) as payment_count,
                COALESCE(SUM(CASE WHEN user_type = 'fisherman' THEN fisherman_amount ELSE total_amount END), 0) as total_amount,
                MIN(created_at) as first_payment,
                MAX(created_at) as last_payment,
                DATEDIFF(MAX(created_at), MIN(created_at)) as active_period_days,
                CASE 
                    WHEN COUNT(*) = 1 THEN 'Single Payment'
                    WHEN COUNT(*) <= 5 THEN 'Low Frequency (2-5)'
                    WHEN COUNT(*) <= 15 THEN 'Medium Frequency (6-15)'
                    WHEN COUNT(*) <= 30 THEN 'High Frequency (16-30)'
                    ELSE 'Very High Frequency (30+)'
                END as frequency_category
            FROM (
                SELECT 
                    'fisherman' as user_type,
                    uf.user_id,
                    uf.name,
                    uf.email,
                    p.fisherman_amount,
                    p.total_amount,
                    p.created_at
                FROM job_payments p
                JOIN users uf ON p.fisherman_id = uf.user_id
                WHERE p.status = 'completed' 
                    AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                UNION ALL
                SELECT 
                    'boat_owner' as user_type,
                    ub.user_id,
                    ub.name,
                    ub.email,
                    p.fisherman_amount,
                    p.total_amount,
                    p.created_at
                FROM job_payments p
                JOIN users ub ON p.boat_owner_id = ub.user_id
                WHERE p.status = 'completed' 
                    AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ) combined_payments
            GROUP BY user_type, user_id, name, email
            ORDER BY payment_count DESC, total_amount DESC
            LIMIT 20
        `, [days, days]);

        // Payment amount distribution analysis
        const [amountDistribution] = await db.query(`
            SELECT 
                CASE 
                    WHEN total_amount < 100 THEN 'Under $100'
                    WHEN total_amount < 250 THEN '$100 - $249'
                    WHEN total_amount < 500 THEN '$250 - $499'
                    WHEN total_amount < 1000 THEN '$500 - $999'
                    WHEN total_amount < 2000 THEN '$1000 - $1999'
                    WHEN total_amount < 5000 THEN '$2000 - $4999'
                    ELSE '$5000+'
                END as amount_range,
                COUNT(*) as payment_count,
                COUNT(DISTINCT boat_owner_id) as unique_boat_owners,
                COUNT(DISTINCT fisherman_id) as unique_fishermen,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COALESCE(AVG(total_amount), 0) as avg_amount,
                COALESCE(SUM(platform_commission), 0) as total_commission
            FROM job_payments 
            WHERE status = 'completed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY 
                CASE 
                    WHEN total_amount < 100 THEN 'Under $100'
                    WHEN total_amount < 250 THEN '$100 - $249'
                    WHEN total_amount < 500 THEN '$250 - $499'
                    WHEN total_amount < 1000 THEN '$500 - $999'
                    WHEN total_amount < 2000 THEN '$1000 - $1999'
                    WHEN total_amount < 5000 THEN '$2000 - $4999'
                    ELSE '$5000+'
                END
            ORDER BY MIN(total_amount)
        `, [days]);

        // User engagement patterns (payment timing)
        const [engagementPatterns] = await db.query(`
            SELECT 
                day_of_week,
                CASE day_of_week
                    WHEN 1 THEN 'Sunday'
                    WHEN 2 THEN 'Monday' 
                    WHEN 3 THEN 'Tuesday'
                    WHEN 4 THEN 'Wednesday'
                    WHEN 5 THEN 'Thursday'
                    WHEN 6 THEN 'Friday'
                    WHEN 7 THEN 'Saturday'
                END as day_name,
                hour_of_day,
                COUNT(*) as payment_count,
                COALESCE(SUM(total_amount), 0) as total_volume,
                COALESCE(AVG(total_amount), 0) as avg_amount
            FROM (
                SELECT 
                    DAYOFWEEK(created_at) as day_of_week,
                    HOUR(created_at) as hour_of_day,
                    total_amount
                FROM job_payments 
                WHERE status = 'completed' 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ) as payment_data
            GROUP BY day_of_week, hour_of_day
            ORDER BY day_of_week, hour_of_day
        `, [days]);

        // User retention analysis
        const [retentionAnalysis] = await db.query(`
            SELECT 
                user_type,
                COUNT(DISTINCT user_id) as total_users,
                COUNT(DISTINCT CASE WHEN payment_count = 1 THEN user_id END) as one_time_users,
                COUNT(DISTINCT CASE WHEN payment_count BETWEEN 2 AND 5 THEN user_id END) as low_frequency_users,
                COUNT(DISTINCT CASE WHEN payment_count BETWEEN 6 AND 15 THEN user_id END) as medium_frequency_users,
                COUNT(DISTINCT CASE WHEN payment_count > 15 THEN user_id END) as high_frequency_users,
                ROUND(AVG(payment_count), 2) as avg_payments_per_user,
                ROUND(AVG(total_amount), 2) as avg_amount_per_user
            FROM (
                SELECT 
                    'fisherman' as user_type,
                    uf.user_id,
                    COUNT(*) as payment_count,
                    SUM(p.fisherman_amount) as total_amount
                FROM job_payments p
                JOIN users uf ON p.fisherman_id = uf.user_id
                WHERE p.status = 'completed' 
                    AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY uf.user_id
                UNION ALL
                SELECT 
                    'boat_owner' as user_type,
                    ub.user_id,
                    COUNT(*) as payment_count,
                    SUM(p.total_amount) as total_amount
                FROM job_payments p
                JOIN users ub ON p.boat_owner_id = ub.user_id
                WHERE p.status = 'completed' 
                    AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY ub.user_id
            ) user_stats
            GROUP BY user_type
        `, [days, days]);

        // Payment success rates by user
        const [successRates] = await db.query(`
            SELECT 
                user_type,
                user_id,
                name,
                email,
                total_payments,
                successful_payments,
                failed_payments,
                pending_payments,
                ROUND((successful_payments / total_payments) * 100, 2) as success_rate,
                total_volume,
                avg_payment_amount
            FROM (
                SELECT 
                    'fisherman' as user_type,
                    uf.user_id,
                    uf.name,
                    uf.email,
                    COUNT(*) as total_payments,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as successful_payments,
                    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
                    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.fisherman_amount END), 0) as total_volume,
                    COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.fisherman_amount END), 0) as avg_payment_amount
                FROM job_payments p
                JOIN users uf ON p.fisherman_id = uf.user_id
                WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY uf.user_id, uf.name, uf.email
                HAVING COUNT(*) >= 3
                UNION ALL
                SELECT 
                    'boat_owner' as user_type,
                    ub.user_id,
                    ub.name,
                    ub.email,
                    COUNT(*) as total_payments,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as successful_payments,
                    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
                    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total_amount END), 0) as total_volume,
                    COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.total_amount END), 0) as avg_payment_amount
                FROM job_payments p
                JOIN users ub ON p.boat_owner_id = ub.user_id
                WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY ub.user_id, ub.name, ub.email
                HAVING COUNT(*) >= 3
            ) success_stats
            ORDER BY success_rate DESC, total_volume DESC
            LIMIT 20
        `, [days, days]);

        res.json({
            top_performers: {
                fishermen: topFishermen || [],
                boat_owners: topBoatOwners || []
            },
            payment_patterns: {
                frequency_analysis: paymentFrequency || [],
                amount_distribution: amountDistribution || [],
                engagement_patterns: engagementPatterns || [],
                retention_analysis: retentionAnalysis || [],
                success_rates: successRates || []
            },
            summary: {
                period_days: days,
                total_fishermen_analyzed: (topFishermen || []).length,
                total_boat_owners_analyzed: (topBoatOwners || []).length,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error fetching user payment analytics:', error);
        res.status(500).json({ message: 'Internal server error while fetching user payment analytics' });
    }
};
