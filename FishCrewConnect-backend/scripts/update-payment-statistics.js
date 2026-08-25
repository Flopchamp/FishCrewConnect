const db = require('../config/db');

/**
 * Recompute the payment_statistics row. Safe to call from a request handler:
 * it never calls process.exit and never closes the shared connection pool.
 * Returns { success, statistics } or { success: false, error } — the shape
 * adminController.refreshPaymentStatistics already expects.
 */
async function refreshPaymentStatistics() {
    try {
        // Calculate statistics from job_payments table
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_payments,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_payment_volume,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission ELSE 0 END), 0) as total_platform_commission,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as average_payment_amount,
                MIN(created_at) as first_payment_date,
                MAX(created_at) as last_payment_date
            FROM job_payments
        `);

        if (!stats || stats.length === 0) {
            return { success: true, statistics: null };
        }

        const statisticsData = stats[0];

        // Insert or update statistics using UPSERT (single row approach)
        await db.execute(`
            INSERT INTO payment_statistics (
                id,
                total_payments,
                completed_payments,
                pending_payments,
                failed_payments,
                disputed_payments,
                total_payment_volume,
                total_platform_commission,
                average_payment_amount,
                first_payment_date,
                last_payment_date
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_payments = VALUES(total_payments),
                completed_payments = VALUES(completed_payments),
                pending_payments = VALUES(pending_payments),
                failed_payments = VALUES(failed_payments),
                disputed_payments = VALUES(disputed_payments),
                total_payment_volume = VALUES(total_payment_volume),
                total_platform_commission = VALUES(total_platform_commission),
                average_payment_amount = VALUES(average_payment_amount),
                first_payment_date = VALUES(first_payment_date),
                last_payment_date = VALUES(last_payment_date),
                updated_at = CURRENT_TIMESTAMP
        `, [
            statisticsData.total_payments,
            statisticsData.completed_payments,
            statisticsData.pending_payments,
            statisticsData.failed_payments,
            statisticsData.disputed_payments,
            statisticsData.total_payment_volume,
            statisticsData.total_platform_commission,
            statisticsData.average_payment_amount,
            statisticsData.first_payment_date,
            statisticsData.last_payment_date
        ]);
        
        return { success: true, statistics: statisticsData };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/** CLI entry point: reports to stdout and closes the pool on the way out. */
async function updatePaymentStatistics() {
    console.log('🔄 Starting payment statistics update...');
    const result = await refreshPaymentStatistics();

    if (!result.success) {
        console.error('💥 Script failed:', result.error);
        await db.end().catch(() => {});
        process.exit(1);
    }

    if (result.statistics === null) {
        console.log('⚠️ No payment data found in job_payments table');
    } else {
        console.log('✅ Payment statistics updated successfully');
        console.table(result.statistics);
    }

    try {
        await db.end();
        console.log('🔌 Database connection closed.');
    } catch (closeError) {
        console.log('⚠️ Warning: Could not close database connection properly');
    }
}

// Run the script
if (require.main === module) {
    updatePaymentStatistics();
}

module.exports = { refreshPaymentStatistics, updatePaymentStatistics };
