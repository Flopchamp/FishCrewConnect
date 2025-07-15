-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category ENUM('technical', 'payment', 'account', 'jobs', 'messaging', 'other') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('open', 'responded', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    
    -- Admin response fields
    admin_id INT NULL,
    admin_response TEXT NULL,
    admin_response_at DATETIME NULL,
    
    -- User follow-up fields
    user_comment TEXT NULL,
    
    -- Timestamps
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- Insert sample support tickets for testing (optional)
-- Note: Make sure to have valid user_ids before running these inserts
/*
INSERT INTO support_tickets (user_id, category, subject, description, priority, status, created_at, updated_at) VALUES
(1, 'technical', 'App crashes when uploading profile photo', 'The app crashes whenever I try to upload a profile photo. This happens both from camera and gallery. I am using Android 12.', 'high', 'open', NOW(), NOW()),
(2, 'payment', 'Payment not received after job completion', 'I completed a fishing job 3 days ago but have not received payment yet. The boat owner says payment was sent but I have not received M-Pesa confirmation.', 'urgent', 'open', NOW(), NOW()),
(3, 'account', 'Cannot verify email address', 'I registered but did not receive the email verification link. I have checked spam folder as well.', 'normal', 'open', NOW(), NOW()),
(1, 'jobs', 'Job posting not appearing in search', 'I created a job posting yesterday but it does not appear when I search for jobs in my area. Other users also cannot see it.', 'high', 'open', NOW(), NOW()),
(2, 'messaging', 'Messages not being delivered', 'My messages to boat owners are not being delivered. The app shows them as sent but recipients are not receiving them.', 'normal', 'open', NOW(), NOW());
*/

-- Add some useful views for support management

-- View for support ticket summary
CREATE OR REPLACE VIEW support_ticket_summary AS
SELECT 
    st.id,
    st.category,
    st.subject,
    st.priority,
    st.status,
    st.created_at,
    st.updated_at,
    u.name as user_name,
    u.email as user_email,
    u.user_type,
    a.name as admin_name,
    st.admin_response_at,
    CASE 
        WHEN st.status = 'open' AND TIMESTAMPDIFF(HOUR, st.created_at, NOW()) > 24 THEN 'overdue'
        WHEN st.status = 'open' AND TIMESTAMPDIFF(HOUR, st.created_at, NOW()) > 4 THEN 'due_soon'
        ELSE 'on_time'
    END as response_status
FROM support_tickets st
JOIN users u ON st.user_id = u.user_id
LEFT JOIN users a ON st.admin_id = a.user_id;

-- View for support statistics
CREATE OR REPLACE VIEW support_statistics AS
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
    COUNT(CASE WHEN priority = 'urgent' AND status IN ('open', 'in_progress') THEN 1 END) as urgent_open_tickets,
    COUNT(CASE WHEN priority = 'high' AND status IN ('open', 'in_progress') THEN 1 END) as high_priority_open_tickets,
    AVG(CASE 
        WHEN status IN ('resolved', 'closed') AND admin_response_at IS NOT NULL 
        THEN TIMESTAMPDIFF(HOUR, created_at, admin_response_at) 
    END) as avg_response_time_hours,
    COUNT(CASE 
        WHEN status = 'open' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 24 
        THEN 1 
    END) as overdue_tickets
FROM support_tickets;

DELIMITER //

-- Procedure to auto-close old resolved tickets
CREATE PROCEDURE CloseOldResolvedTickets()
BEGIN
    UPDATE support_tickets 
    SET status = 'closed', updated_at = NOW()
    WHERE status = 'resolved' 
    AND TIMESTAMPDIFF(DAY, admin_response_at, NOW()) > 7;
    
    SELECT ROW_COUNT() as tickets_closed;
END //

-- Procedure to get support metrics for a date range
CREATE PROCEDURE GetSupportMetrics(IN start_date DATE, IN end_date DATE)
BEGIN
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN category = 'technical' THEN 1 END) as technical_tickets,
        COUNT(CASE WHEN category = 'payment' THEN 1 END) as payment_tickets,
        COUNT(CASE WHEN category = 'account' THEN 1 END) as account_tickets,
        COUNT(CASE WHEN category = 'jobs' THEN 1 END) as job_tickets,
        COUNT(CASE WHEN category = 'messaging' THEN 1 END) as messaging_tickets,
        COUNT(CASE WHEN category = 'other' THEN 1 END) as other_tickets,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets
    FROM support_tickets 
    WHERE DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY DATE(created_at)
    ORDER BY date;
END //

DELIMITER ;

-- Add some useful triggers

DELIMITER //

-- Trigger to update updated_at timestamp automatically
CREATE TRIGGER update_support_ticket_timestamp 
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END //

-- Trigger to log when admin responds to a ticket
CREATE TRIGGER log_admin_response 
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
BEGIN
    IF NEW.admin_response IS NOT NULL AND OLD.admin_response IS NULL THEN
        SET NEW.admin_response_at = NOW();
        IF NEW.status = 'open' THEN
            SET NEW.status = 'responded';
        END IF;
    END IF;
END //

DELIMITER ;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON support_tickets TO 'app_user'@'%';
-- GRANT SELECT ON support_ticket_summary TO 'app_user'@'%';
-- GRANT SELECT ON support_statistics TO 'app_user'@'%';

-- Show the table structure
DESCRIBE support_tickets;
