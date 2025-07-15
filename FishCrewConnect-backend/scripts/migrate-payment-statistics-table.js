const db = require('../config/db');

/**
 * Migration script to convert payment_statistics from VIEW to TABLE
 * This allows us to properly store and update aggregated payment statistics
 */

async function migratePaymentStatisticsTable() {
    try {
        console.log('🔄 Starting migration: Converting payment_statistics from VIEW to TABLE...');
        
        // First, let's check if it's currently a view
        const [viewCheck] = await db.execute(`
            SELECT TABLE_TYPE 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'fishcrew' 
            AND TABLE_NAME = 'payment_statistics'
        `);
        
        if (viewCheck.length > 0) {
            console.log(`📋 Current type: ${viewCheck[0].TABLE_TYPE}`);
            
            if (viewCheck[0].TABLE_TYPE === 'VIEW') {
                console.log('🗑️ Dropping existing VIEW...');
                await db.execute('DROP VIEW payment_statistics');
                console.log('✅ VIEW dropped successfully');
            } else if (viewCheck[0].TABLE_TYPE === 'BASE TABLE') {
                console.log('📊 payment_statistics is already a table, checking structure...');
                
                // Check if it has the id column
                const [columns] = await db.execute(`
                    SELECT COLUMN_NAME 
                    FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'fishcrew' 
                    AND TABLE_NAME = 'payment_statistics' 
                    AND COLUMN_NAME = 'id'
                `);
                
                if (columns.length === 0) {
                    console.log('🔧 Adding missing columns to existing table...');
                    await db.execute(`
                        ALTER TABLE payment_statistics 
                        ADD COLUMN id INT PRIMARY KEY AUTO_INCREMENT FIRST,
                        ADD COLUMN disputed_payments BIGINT NOT NULL DEFAULT 0 AFTER failed_payments,
                        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    `);
                    console.log('✅ Columns added successfully');
                    return;
                } else {
                    console.log('✅ Table already has correct structure');
                    return;
                }
            }
        }
        
        // Create the new table with proper structure
        console.log('🏗️ Creating new payment_statistics TABLE...');
        await db.execute(`
            CREATE TABLE payment_statistics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                total_payments BIGINT NOT NULL DEFAULT 0,
                completed_payments BIGINT NOT NULL DEFAULT 0,
                pending_payments BIGINT NOT NULL DEFAULT 0,
                failed_payments BIGINT NOT NULL DEFAULT 0,
                disputed_payments BIGINT NOT NULL DEFAULT 0,
                total_payment_volume DECIMAL(32,2) DEFAULT 0.00,
                total_platform_commission DECIMAL(32,2) DEFAULT 0.00,
                average_payment_amount DECIMAL(14,6) DEFAULT 0.000000,
                first_payment_date DATE NULL,
                last_payment_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ payment_statistics TABLE created successfully');
        
        // Now populate it with initial data from job_payments
        console.log('📊 Calculating initial statistics from job_payments...');
        
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_payments,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_payment_volume,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as total_platform_commission,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as average_payment_amount,
                MIN(created_at) as first_payment_date,
                MAX(created_at) as last_payment_date
            FROM job_payments
        `);
        
        if (stats.length > 0) {
            const statisticsData = stats[0];
            console.log('📈 Initial statistics calculated:', statisticsData);
            
            // Insert the initial data
            await db.execute(`
                INSERT INTO payment_statistics (
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            
            console.log('✅ Initial statistics data inserted');
        }
        
        // Verify the final structure
        const [finalStructure] = await db.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'fishcrew' 
            AND TABLE_NAME = 'payment_statistics'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('\n📋 Final table structure:');
        console.table(finalStructure);
        
        // Show the current data
        const [currentData] = await db.execute('SELECT * FROM payment_statistics');
        console.log('\n📊 Current statistics data:');
        console.table(currentData);
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('💡 The aggregation script can now use proper INSERT/UPDATE operations.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run the migration
if (require.main === module) {
    migratePaymentStatisticsTable()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migratePaymentStatisticsTable };
