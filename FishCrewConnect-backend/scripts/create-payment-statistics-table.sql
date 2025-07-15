-- Create payment_statistics table if it doesn't exist
-- This will be a regular table that can be updated

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
);

-- Insert initial row if table is empty
INSERT IGNORE INTO payment_statistics (id) VALUES (1);
