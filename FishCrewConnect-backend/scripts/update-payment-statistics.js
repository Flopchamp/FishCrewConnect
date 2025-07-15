const db = require('../config/db');

async function updatePaymentStatistics() {
    try {
        console.log('🔄 Starting payment statistics update...');
        
        // Test database connection
        try {
            await db.execute('SELECT 1');
            console.log('✅ Successfully connected to MySQL database.');
        } catch (connectionError) {
            console.error('❌ Database connection failed:', connectionError.message);
            process.exit(1);
        }

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
            console.log('⚠️ No payment data found in job_payments table');
            return;
        }
        
        const statisticsData = stats[0];
        console.log('📈 Calculated statistics:', statisticsData);

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
        
        console.log('✅ Payment statistics updated successfully');
        
        // Show the updated statistics
        const [updatedStats] = await db.execute('SELECT * FROM payment_statistics WHERE id = 1');
        if (updatedStats && updatedStats.length > 0) {
            console.log('\n📊 Updated Payment Statistics:');
            console.table(updatedStats[0]);
            
            const stats_summary = updatedStats[0];
            console.log('\n💰 Summary:');
            console.log(`Total Revenue: KSH ${parseFloat(stats_summary.total_payment_volume).toLocaleString()}`);
            console.log(`Platform Commission: KSH ${parseFloat(stats_summary.total_platform_commission).toLocaleString()}`);
            console.log(`Success Rate: ${stats_summary.total_payments > 0 ? ((stats_summary.completed_payments / stats_summary.total_payments) * 100).toFixed(2) : 0}%`);
        }
        
        console.log('\n🎉 Payment statistics aggregation completed successfully!');
        
    } catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        try {
            await db.end();
            console.log('🔌 Database connection closed.');
        } catch (closeError) {
            console.log('⚠️ Warning: Could not close database connection properly');
        }
    }
}

// Run the script
if (require.main === module) {
    updatePaymentStatistics();
}

module.exports = updatePaymentStatistics;
