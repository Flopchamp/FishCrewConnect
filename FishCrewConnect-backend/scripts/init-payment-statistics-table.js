const db = require('../config/db');

async function initializePaymentStatisticsTable() {
    try {
        console.log('Initializing payment_statistics table...');

        // Create the table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_statistics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                total_payments BIGINT NOT NULL DEFAULT 0,
                completed_payments BIGINT NOT NULL DEFAULT 0,
                pending_payments BIGINT NOT NULL DEFAULT 0,
                failed_payments BIGINT NOT NULL DEFAULT 0,
                total_payment_volume DECIMAL(32,2) DEFAULT NULL,
                total_platform_commission DECIMAL(32,2) DEFAULT NULL,
                average_payment_amount DECIMAL(14,6) DEFAULT NULL,
                first_payment_date DATE DEFAULT NULL,
                last_payment_date DATE DEFAULT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert initial row if table is empty
        await db.query(`
            INSERT INTO payment_statistics (id) VALUES (1)
            ON DUPLICATE KEY UPDATE id = id
        `);

        console.log('Payment statistics table initialized successfully');
        return { success: true };

    } catch (error) {
        console.error('Error initializing payment statistics table:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { initializePaymentStatisticsTable };

// If this script is run directly, execute the initialization
if (require.main === module) {
    initializePaymentStatisticsTable()
        .then((result) => {
            if (result.success) {
                console.log('Payment statistics table initialization completed successfully');
                process.exit(0);
            } else {
                console.error('Payment statistics table initialization failed:', result.error);
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Unexpected error during payment statistics table initialization:', error);
            process.exit(1);
        });
}
