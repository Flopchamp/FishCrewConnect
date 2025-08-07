const db = require('../config/db');

// Create job_payments table if it doesn't exist
async function createPaymentsTable() {
    try {
        console.log('Creating job_payments table if it doesn\'t exist...');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS job_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id INT NOT NULL,
                application_id INT,
                boat_owner_id INT NOT NULL,
                fisherman_id INT NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                fisherman_amount DECIMAL(10, 2) NOT NULL,
                platform_commission DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'completed', 'failed', 'cancelled', 'disputed', 'refunded', 'reversed') DEFAULT 'pending',
                mpesa_checkout_request_id VARCHAR(255),
                mpesa_merchant_request_id VARCHAR(255),
                mpesa_receipt_number VARCHAR(255),
                failure_reason TEXT,
                completed_at TIMESTAMP NULL,
                refund_amount DECIMAL(10, 2) NULL,
                refund_reason TEXT NULL,
                refunded_at TIMESTAMP NULL,
                refunded_by INT NULL,
                reversal_reason TEXT NULL,
                reversed_at TIMESTAMP NULL,
                reversed_by INT NULL,
                admin_notes TEXT NULL,
                status_overridden_at TIMESTAMP NULL,
                status_overridden_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
                FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE SET NULL,
                FOREIGN KEY (boat_owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (fisherman_id) REFERENCES users(user_id) ON DELETE CASCADE,
                
                INDEX idx_job_payment (job_id),
                INDEX idx_boat_owner_payment (boat_owner_id),
                INDEX idx_fisherman_payment (fisherman_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await db.query(createTableQuery);
        console.log('✅ job_payments table created successfully or already exists');

        // Check if table exists and show its structure
        const [tableInfo] = await db.query('DESCRIBE job_payments');
        console.log('Table structure:');
        console.table(tableInfo);

        return true;
    } catch (error) {
        console.error('❌ Error creating job_payments table:', error);
        return false;
    }
}

// Check if all required tables exist
async function checkRequiredTables() {
    const requiredTables = ['users', 'jobs', 'job_applications', 'job_payments'];
    
    try {
        console.log('Checking for required tables...');
        
        for (const table of requiredTables) {
            const [result] = await db.query(`SHOW TABLES LIKE '${table}'`);
            if (result.length === 0) {
                console.log(`❌ Table ${table} does not exist`);
            } else {
                console.log(`✅ Table ${table} exists`);
            }
        }
    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

async function runDatabaseSetup() {
    console.log('🔧 Database Setup for Payments');
    console.log('===============================\n');
    
    await checkRequiredTables();
    console.log();
    await createPaymentsTable();
    
    console.log('\n🎉 Database setup completed!');
    process.exit(0);
}

if (require.main === module) {
    runDatabaseSetup();
}

module.exports = {
    createPaymentsTable,
    checkRequiredTables
};
