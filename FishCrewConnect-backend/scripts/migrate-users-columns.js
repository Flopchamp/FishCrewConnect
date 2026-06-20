/**
 * Migration: bring the live database schema up to date with setup-database.js.
 * Safe to re-run — ALTERs are skipped if the column already exists (errno 1060),
 * and CREATE TABLE IF NOT EXISTS is a no-op on existing tables (errno 1050).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host:     process.env.MYSQL_HOST     || 'localhost',
        user:     process.env.MYSQL_USER     || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'fishcrewconnect',
        port:     parseInt(process.env.MYSQL_PORT || '3306'),
    });

    const alterations = [
        // ── users ────────────────────────────────────────────────────────────
        {
            label: 'users.account_status',
            sql: `ALTER TABLE users ADD COLUMN account_status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active' AFTER verification_status`,
        },
        {
            label: 'users.verified_at',
            sql: `ALTER TABLE users ADD COLUMN verified_at DATETIME DEFAULT NULL AFTER account_status`,
        },
        {
            label: 'users.verified_by',
            sql: `ALTER TABLE users ADD COLUMN verified_by INT DEFAULT NULL AFTER verified_at`,
        },

        // ── user_verification_requests ────────────────────────────────────────
        {
            label: 'user_verification_requests.user_message',
            sql: `ALTER TABLE user_verification_requests ADD COLUMN user_message TEXT DEFAULT NULL AFTER status`,
        },
        {
            label: 'user_verification_requests.admin_notes',
            sql: `ALTER TABLE user_verification_requests ADD COLUMN admin_notes TEXT DEFAULT NULL AFTER user_message`,
        },
        {
            label: 'user_verification_requests.processed_by',
            sql: `ALTER TABLE user_verification_requests ADD COLUMN processed_by INT DEFAULT NULL AFTER admin_notes`,
        },
        {
            label: 'user_verification_requests.requested_at',
            sql: `ALTER TABLE user_verification_requests ADD COLUMN requested_at DATETIME DEFAULT NULL AFTER processed_by`,
        },
        {
            label: 'user_verification_requests.processed_at',
            sql: `ALTER TABLE user_verification_requests ADD COLUMN processed_at DATETIME DEFAULT NULL AFTER requested_at`,
        },
        // Extend the status ENUM to include 'verified'
        {
            label: "user_verification_requests.status ENUM (+verified)",
            sql: `ALTER TABLE user_verification_requests MODIFY COLUMN status ENUM('pending','approved','rejected','verified') NOT NULL DEFAULT 'pending'`,
        },

        // ── jobs ──────────────────────────────────────────────────────────────
        {
            label: "jobs.status ENUM (+in_progress,+filled,+cancelled)",
            sql: `ALTER TABLE jobs MODIFY COLUMN status ENUM('open','in_progress','closed','completed','filled','cancelled') NOT NULL DEFAULT 'open'`,
        },

        // ── admin_actions (create if missing) ─────────────────────────────────
        {
            label: "admin_actions table",
            sql: `CREATE TABLE IF NOT EXISTS admin_actions (
                id                 INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
                admin_id           INT           NOT NULL,
                action_type        VARCHAR(100)  NOT NULL,
                action_description TEXT          NOT NULL,
                target_type        VARCHAR(50)   DEFAULT NULL,
                target_id          INT           DEFAULT NULL,
                details            JSON          DEFAULT NULL,
                ip_address         VARCHAR(45)   DEFAULT NULL,
                user_agent         TEXT          DEFAULT NULL,
                created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_admin_id    (admin_id),
                INDEX idx_action_type (action_type),
                INDEX idx_target      (target_type, target_id),
                INDEX idx_created     (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        },

        // ── system_settings ───────────────────────────────────────────────────
        {
            label: 'system_settings.setting_type',
            sql: `ALTER TABLE system_settings ADD COLUMN setting_type VARCHAR(50) NOT NULL DEFAULT 'string' AFTER setting_value`,
        },
        {
            label: 'system_settings.category',
            sql: `ALTER TABLE system_settings ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'general' AFTER setting_type`,
        },
        {
            label: 'system_settings.description',
            sql: `ALTER TABLE system_settings ADD COLUMN description TEXT DEFAULT NULL AFTER category`,
        },
        {
            label: 'system_settings category index',
            sql: `ALTER TABLE system_settings ADD INDEX idx_category (category)`,
        },
    ];

    for (const alt of alterations) {
        try {
            await conn.query(alt.sql);
            console.log(`  added:   ${alt.label}`);
        } catch (err) {
            if (err.errno === 1060 || err.errno === 1050) {
                console.log(`  skipped: ${alt.label} (already exists)`);
            } else {
                console.error(`  failed:  ${alt.label} — ${err.message}`);
            }
        }
    }

    // ── system_settings data migration ────────────────────────────────────────
    // 1. Assign categories to the original seeded settings
    console.log('\nUpdating system_settings categories...');
    const categoryUpdates = [
        ['features', ['user_registration_enabled', 'job_posting_enabled', 'messaging_enabled',
                      'notifications_enabled', 'admin_access_override']],
        ['general',  ['maintenance_mode']],
        ['payment',  ['platform_commission_rate']],
    ];
    for (const [category, keys] of categoryUpdates) {
        const placeholders = keys.map(() => '?').join(',');
        try {
            await conn.query(
                `UPDATE system_settings SET category = ? WHERE setting_key IN (${placeholders})`,
                [category, ...keys]
            );
            console.log(`  updated: category='${category}' for ${keys.length} key(s)`);
        } catch (err) {
            console.error(`  failed:  category update for ${category} — ${err.message}`);
        }
    }

    // 2. Rename platform_commission_rate → commission_rate (payment category)
    try {
        const [exists] = await conn.query(
            "SELECT setting_key FROM system_settings WHERE setting_key = 'platform_commission_rate'"
        );
        if (exists.length > 0) {
            await conn.query(
                "UPDATE system_settings SET setting_key = 'commission_rate', category = 'payment' WHERE setting_key = 'platform_commission_rate'"
            );
            console.log('  renamed: platform_commission_rate → commission_rate');
        } else {
            console.log('  skipped: platform_commission_rate rename (not found or already renamed)');
        }
    } catch (err) {
        console.error(`  failed:  rename commission_rate — ${err.message}`);
    }

    // 3. Seed all new settings (INSERT IGNORE = skip if key already exists)
    console.log('\nSeeding new system_settings...');
    const newSettings = [
        // general
        ['platform_name',              '"FishCrewConnect"',                                 'string',  'general',       'Platform display name'],
        ['platform_description',       '"Connecting boat owners with skilled fishermen"',   'string',  'general',       'Platform tagline'],
        ['support_email',              '"support@fishcrewconnect.com"',                     'string',  'general',       'Support contact email'],
        ['contact_phone',              '""',                                                'string',  'general',       'Support contact phone'],
        // features (new ones not in original seed)
        ['email_notifications_enabled','false', 'boolean', 'features', 'Send email notifications to users'],
        ['payment_processing_enabled', 'true',  'boolean', 'features', 'Enable M-Pesa payment processing'],
        ['file_uploads_enabled',       'true',  'boolean', 'features', 'Allow CV and document uploads'],
        // limits
        ['max_jobs_per_user',          '10',    'number',  'limits',   'Maximum active jobs a user can post'],
        ['max_applications_per_job',   '50',    'number',  'limits',   'Maximum applications allowed per job'],
        ['max_file_size_mb',           '10',    'number',  'limits',   'Maximum file upload size in MB'],
        ['max_messages_per_day',       '100',   'number',  'limits',   'Maximum messages per user per day'],
        // payment
        ['commission_rate',            '0.05',   'number',  'payment', 'Platform commission rate (decimal)'],
        ['minimum_amount',             '100',    'number',  'payment', 'Minimum payment amount in KES'],
        ['maximum_amount',             '1000000','number',  'payment', 'Maximum payment amount in KES'],
        ['auto_approve_payments',      'false',  'boolean', 'payment', 'Auto-approve completed payments'],
        // email
        ['smtp_host',         '""',    'string',  'email', 'SMTP server hostname'],
        ['smtp_port',         '587',   'number',  'email', 'SMTP server port'],
        ['smtp_username',     '""',    'string',  'email', 'SMTP username'],
        ['smtp_password',     '""',    'string',  'email', 'SMTP password'],
        ['enable_notifications','false','boolean','email',  'Enable outbound email notifications'],
        // notifications
        ['new_user_signup',  'true',  'boolean', 'notifications', 'Alert admin on new user signup'],
        ['new_job_posted',   'false', 'boolean', 'notifications', 'Alert admin on new job posting'],
        ['payment_received', 'true',  'boolean', 'notifications', 'Alert admin on payment received'],
        ['system_alerts',    'true',  'boolean', 'notifications', 'Send system alert notifications'],
        ['admin_email',      '""',    'string',  'notifications', 'Admin email for notifications'],
        // security
        ['max_login_attempts',         '5',     'number',  'security', 'Max failed login attempts before lockout'],
        ['token_expiration',           '24',    'number',  'security', 'JWT token lifetime in hours'],
        ['require_email_verification', 'true',  'boolean', 'security', 'Require OTP email verification'],
        ['enable_two_factor',          'false', 'boolean', 'security', 'Enable two-factor authentication'],
        // system
        ['backup_frequency',  '"daily"', 'string',  'system', 'Database backup schedule'],
        ['log_level',         '"info"',  'string',  'system', 'Application log level'],
        ['session_timeout',   '30',      'number',  'system', 'Idle session timeout in minutes'],
        ['enable_analytics',  'false',   'boolean', 'system', 'Enable analytics tracking'],
        ['auto_cleanup_logs', 'false',   'boolean', 'system', 'Auto cleanup old logs'],
    ];
    for (const [key, value, type, category, desc] of newSettings) {
        try {
            await conn.query(
                'INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES (?, ?, ?, ?, ?)',
                [key, value, type, category, desc]
            );
        } catch (err) {
            console.error(`  failed:  seed ${key} — ${err.message}`);
        }
    }
    console.log(`  seeded:  ${newSettings.length} settings (skipped any already present)`);

    await conn.end();
    console.log('\nMigration complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
