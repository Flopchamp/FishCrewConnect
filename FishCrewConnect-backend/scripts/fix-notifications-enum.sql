-- Fix notifications table ENUM to include payment notification types
-- This script adds payment-related notification types to the existing ENUM

USE fishcrewconnect;

-- Update the notifications table to include payment notification types
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
    'new_application',
    'application_update', 
    'new_review',
    'new_message',
    'payment_initiated',
    'payment_completed',
    'payment_failed'
) NOT NULL;

-- Verify the change
DESCRIBE notifications;

-- Show sample of existing notifications to ensure no data loss
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type 
ORDER BY count DESC;
