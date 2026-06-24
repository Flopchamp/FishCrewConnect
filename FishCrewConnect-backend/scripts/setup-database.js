/**
 * FishCrewConnect — Full Database Setup
 * Run once: node scripts/setup-database.js
 *
 * Creates every table in dependency order and seeds default system settings.
 * Safe to re-run: all statements use CREATE TABLE IF NOT EXISTS.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const DB_NAME = process.env.MYSQL_DATABASE || 'fishcrewconnect';
// Set SKIP_DB_CREATE=true when the database already exists (e.g. PlanetScale)
const skipDbCreate = process.env.SKIP_DB_CREATE === 'true';

const config = {
    host:     process.env.MYSQL_HOST     || 'localhost',
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    ssl:      process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true,
    ...(skipDbCreate ? { database: DB_NAME } : {}),
};

// ─── helpers ─────────────────────────────────────────────────────────────────

let conn;
let passed = 0;
let failed = 0;

async function run(label, sql) {
    try {
        await conn.query(sql);   // query() supports DDL; execute() (prepared stmts) does not
        console.log(`  ✅  ${label}`);
        passed++;
    } catch (err) {
        console.error(`  ❌  ${label}: ${err.message}`);
        failed++;
    }
}

// ─── table definitions ────────────────────────────────────────────────────────

async function createTables() {

    // 1. users — no FK dependencies
    await run('users', `
        CREATE TABLE IF NOT EXISTS users (
            user_id             INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name                VARCHAR(255)   NOT NULL,
            email               VARCHAR(255)   NOT NULL UNIQUE,
            password_hash       VARCHAR(255)   NOT NULL,
            user_type           ENUM('boat_owner','fisherman','admin') NOT NULL,
            contact_number      VARCHAR(20)    DEFAULT NULL,
            organization_name   VARCHAR(255)   DEFAULT NULL,
            verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
            verified_at         DATETIME       DEFAULT NULL,
            verified_by         INT            DEFAULT NULL,
            account_status      ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
            created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email         (email),
            INDEX idx_user_type     (user_type),
            INDEX idx_verification  (verification_status),
            INDEX idx_account_status (account_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. user_profiles — depends on users
    await run('user_profiles', `
        CREATE TABLE IF NOT EXISTS user_profiles (
            id               INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id          INT            NOT NULL UNIQUE,
            profile_image    VARCHAR(500)   DEFAULT NULL,
            location         VARCHAR(255)   DEFAULT NULL,
            years_experience INT            DEFAULT 0,
            bio              TEXT           DEFAULT NULL,
            specialties      JSON           DEFAULT NULL,
            skills           JSON           DEFAULT NULL,
            available        TINYINT(1)     NOT NULL DEFAULT 1,
            rating           DECIMAL(3,2)   DEFAULT NULL,
            created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. user_verification_requests — depends on users
    await run('user_verification_requests', `
        CREATE TABLE IF NOT EXISTS user_verification_requests (
            id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id      INT          NOT NULL,
            request_type VARCHAR(50)  NOT NULL DEFAULT 'registration',
            status       ENUM('pending','approved','rejected','verified') NOT NULL DEFAULT 'pending',
            user_message TEXT         DEFAULT NULL,
            admin_notes  TEXT         DEFAULT NULL,
            processed_by INT          DEFAULT NULL,
            requested_at DATETIME     DEFAULT NULL,
            processed_at DATETIME     DEFAULT NULL,
            created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)      REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL,
            INDEX idx_user_id (user_id),
            INDEX idx_status  (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. password_resets — depends on users
    await run('password_resets', `
        CREATE TABLE IF NOT EXISTS password_resets (
            user_id     INT          NOT NULL PRIMARY KEY,
            reset_token VARCHAR(255) NOT NULL,
            expires_at  DATETIME     NOT NULL,
            created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            INDEX idx_token      (reset_token),
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. otp_verifications — email is the unique key (ON DUPLICATE KEY UPDATE pattern)
    await run('otp_verifications', `
        CREATE TABLE IF NOT EXISTS otp_verifications (
            email      VARCHAR(255) NOT NULL PRIMARY KEY,
            otp_code   VARCHAR(6)   NOT NULL,
            expires_at DATETIME     NOT NULL,
            verified   TINYINT(1)   NOT NULL DEFAULT 0,
            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. jobs — depends on users
    await run('jobs', `
        CREATE TABLE IF NOT EXISTS jobs (
            job_id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id              INT          NOT NULL,
            job_title            VARCHAR(255) NOT NULL,
            description          TEXT         DEFAULT NULL,
            location             VARCHAR(255) DEFAULT NULL,
            payment_details      VARCHAR(255) DEFAULT NULL,
            application_deadline DATETIME     DEFAULT NULL,
            job_duration         VARCHAR(100) DEFAULT NULL,
            status               ENUM('open','in_progress','closed','completed','filled','cancelled') NOT NULL DEFAULT 'open',
            created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            INDEX idx_user_id  (user_id),
            INDEX idx_status   (status),
            INDEX idx_created  (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. job_applications — depends on jobs, users
    await run('job_applications', `
        CREATE TABLE IF NOT EXISTS job_applications (
            id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            job_id           INT          NOT NULL,
            user_id          INT          NOT NULL,
            cover_letter     TEXT         DEFAULT NULL,
            cv_file_url      VARCHAR(500) DEFAULT NULL,
            cv_file_name     VARCHAR(255) DEFAULT NULL,
            cv_file_size     INT          DEFAULT NULL,
            status           ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
            application_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id)  REFERENCES jobs(job_id)   ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            UNIQUE KEY uq_job_user (job_id, user_id),
            INDEX idx_job_id  (job_id),
            INDEX idx_user_id (user_id),
            INDEX idx_status  (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. messages — depends on users
    await run('messages', `
        CREATE TABLE IF NOT EXISTS messages (
            id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            sender_id    INT          NOT NULL,
            recipient_id INT          NOT NULL,
            message_text TEXT         NOT NULL,
            is_read      TINYINT(1)   NOT NULL DEFAULT 0,
            created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id)    REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE,
            INDEX idx_sender    (sender_id),
            INDEX idx_recipient (recipient_id),
            INDEX idx_created   (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. notifications — depends on users
    await run('notifications', `
        CREATE TABLE IF NOT EXISTS notifications (
            id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id    INT          NOT NULL,
            type       ENUM(
                           'new_application',
                           'application_update',
                           'new_review',
                           'new_message',
                           'payment_initiated',
                           'payment_completed',
                           'payment_failed',
                           'payment_received'
                       )            NOT NULL,
            message    TEXT         NOT NULL,
            link       VARCHAR(500) DEFAULT NULL,
            is_read    TINYINT(1)   NOT NULL DEFAULT 0,
            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            INDEX idx_user_id  (user_id),
            INDEX idx_is_read  (is_read),
            INDEX idx_created  (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 10. reviews — depends on users, jobs
    await run('reviews', `
        CREATE TABLE IF NOT EXISTS reviews (
            id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            reviewer_id      INT          NOT NULL,
            reviewed_user_id INT          NOT NULL,
            job_id           INT          NOT NULL,
            rating           TINYINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment          TEXT         DEFAULT NULL,
            created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reviewer_id)      REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (job_id)           REFERENCES jobs(job_id)   ON DELETE CASCADE,
            UNIQUE KEY uq_review (reviewer_id, reviewed_user_id, job_id),
            INDEX idx_reviewed_user (reviewed_user_id),
            INDEX idx_job_id        (job_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 11. job_payments — depends on jobs, job_applications, users
    await run('job_payments', `
        CREATE TABLE IF NOT EXISTS job_payments (
            id                           INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
            job_id                       INT            NOT NULL,
            application_id               INT            DEFAULT NULL,
            boat_owner_id                INT            NOT NULL,
            fisherman_id                 INT            NOT NULL,
            total_amount                 DECIMAL(10,2)  NOT NULL,
            fisherman_amount             DECIMAL(10,2)  NOT NULL,
            platform_commission          DECIMAL(10,2)  NOT NULL,
            status                       ENUM('pending','completed','failed','cancelled','disputed','refunded','reversed')
                                                        NOT NULL DEFAULT 'pending',
            mpesa_checkout_request_id    VARCHAR(255)   DEFAULT NULL,
            mpesa_merchant_request_id    VARCHAR(255)   DEFAULT NULL,
            mpesa_receipt_number         VARCHAR(255)   DEFAULT NULL,
            payer_phone_number           VARCHAR(20)    DEFAULT NULL,
            b2c_conversation_id          VARCHAR(255)   DEFAULT NULL,
            b2c_originator_conversation_id VARCHAR(255) DEFAULT NULL,
            b2c_status                   VARCHAR(50)    DEFAULT NULL,
            b2c_result_desc              TEXT           DEFAULT NULL,
            failure_reason               TEXT           DEFAULT NULL,
            completed_at                 DATETIME       DEFAULT NULL,
            refund_amount                DECIMAL(10,2)  DEFAULT NULL,
            refund_reason                TEXT           DEFAULT NULL,
            refunded_at                  DATETIME       DEFAULT NULL,
            refunded_by                  INT            DEFAULT NULL,
            reversal_reason              TEXT           DEFAULT NULL,
            reversed_at                  DATETIME       DEFAULT NULL,
            reversed_by                  INT            DEFAULT NULL,
            admin_notes                  TEXT           DEFAULT NULL,
            status_overridden_at         DATETIME       DEFAULT NULL,
            status_overridden_by         INT            DEFAULT NULL,
            created_at                   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at                   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id)         REFERENCES jobs(job_id)            ON DELETE CASCADE,
            FOREIGN KEY (application_id) REFERENCES job_applications(id)    ON DELETE SET NULL,
            FOREIGN KEY (boat_owner_id)  REFERENCES users(user_id)          ON DELETE CASCADE,
            FOREIGN KEY (fisherman_id)   REFERENCES users(user_id)          ON DELETE CASCADE,
            INDEX idx_job_id        (job_id),
            INDEX idx_boat_owner    (boat_owner_id),
            INDEX idx_fisherman     (fisherman_id),
            INDEX idx_status        (status),
            INDEX idx_created       (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 12. payment_statistics — no FK dependencies
    await run('payment_statistics', `
        CREATE TABLE IF NOT EXISTS payment_statistics (
            id                        INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
            total_payments            BIGINT         NOT NULL DEFAULT 0,
            completed_payments        BIGINT         NOT NULL DEFAULT 0,
            pending_payments          BIGINT         NOT NULL DEFAULT 0,
            failed_payments           BIGINT         NOT NULL DEFAULT 0,
            total_payment_volume      DECIMAL(32,2)  DEFAULT NULL,
            total_platform_commission DECIMAL(32,2)  DEFAULT NULL,
            average_payment_amount    DECIMAL(14,6)  DEFAULT NULL,
            first_payment_date        DATE           DEFAULT NULL,
            last_payment_date         DATE           DEFAULT NULL,
            last_updated              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at                DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 13. support_tickets — depends on users
    await run('support_tickets', `
        CREATE TABLE IF NOT EXISTS support_tickets (
            id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id          INT          NOT NULL,
            category         ENUM('technical','payment','account','jobs','messaging','other') NOT NULL,
            subject          VARCHAR(255) NOT NULL,
            description      TEXT         NOT NULL,
            priority         ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
            status           ENUM('open','responded','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
            admin_id         INT          DEFAULT NULL,
            admin_response   TEXT         DEFAULT NULL,
            admin_response_at DATETIME    DEFAULT NULL,
            user_comment     TEXT         DEFAULT NULL,
            created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)  REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
            INDEX idx_user_id  (user_id),
            INDEX idx_status   (status),
            INDEX idx_category (category),
            INDEX idx_priority (priority),
            INDEX idx_created  (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 14. system_settings — no FK dependencies
    await run('system_settings', `
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key   VARCHAR(100) NOT NULL PRIMARY KEY,
            setting_value TEXT         NOT NULL,
            setting_type  VARCHAR(50)  NOT NULL DEFAULT 'string',
            category      VARCHAR(50)  NOT NULL DEFAULT 'general',
            description   TEXT         DEFAULT NULL,
            updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 15. admin_actions — depends on users
    await run('admin_actions', `
        CREATE TABLE IF NOT EXISTS admin_actions (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 16. token_blacklist — no FK dependencies
    await run('token_blacklist', `
        CREATE TABLE IF NOT EXISTS token_blacklist (
            jti        VARCHAR(36)  NOT NULL PRIMARY KEY,
            expires_at DATETIME     NOT NULL,
            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

// ─── seed data ────────────────────────────────────────────────────────────────

async function seedDefaults() {
    // Seed the single payment_statistics row
    await conn.query(`INSERT IGNORE INTO payment_statistics (id) VALUES (1)`);

    // Seed default system settings (INSERT IGNORE so existing values are preserved)
    // Format: [key, value, type, category, description]
    const defaults = [
        // ── general ──────────────────────────────────────────────────────────
        ['platform_name',              '"FishCrewConnect"',                                 'string',  'general',       'Platform display name'],
        ['platform_description',       '"Connecting boat owners with skilled fishermen"',   'string',  'general',       'Platform tagline shown to users'],
        ['support_email',              '"support@fishcrewconnect.com"',                     'string',  'general',       'Support contact email address'],
        ['contact_phone',              '""',                                                'string',  'general',       'Support contact phone number'],
        ['maintenance_mode',           'false',                                             'boolean', 'general',       'Put the platform in maintenance mode (blocks non-admin access)'],

        // ── features ─────────────────────────────────────────────────────────
        ['user_registration_enabled',  'true',  'boolean', 'features', 'Allow new users to register on the platform'],
        ['job_posting_enabled',        'true',  'boolean', 'features', 'Allow users to post new job listings'],
        ['messaging_enabled',          'true',  'boolean', 'features', 'Enable messaging between users'],
        ['notifications_enabled',      'true',  'boolean', 'features', 'Enable in-app notifications'],
        ['email_notifications_enabled','false', 'boolean', 'features', 'Send email notifications to users'],
        ['payment_processing_enabled', 'true',  'boolean', 'features', 'Enable M-Pesa payment processing'],
        ['file_uploads_enabled',       'true',  'boolean', 'features', 'Allow CV and document uploads'],
        ['admin_access_override',      'true',  'boolean', 'features', 'Keep admin access active during maintenance mode'],

        // ── limits ───────────────────────────────────────────────────────────
        ['max_jobs_per_user',          '10',    'number',  'limits',   'Maximum active jobs a user can post'],
        ['max_applications_per_job',   '50',    'number',  'limits',   'Maximum applications allowed per job listing'],
        ['max_file_size_mb',           '10',    'number',  'limits',   'Maximum file upload size in megabytes'],
        ['max_messages_per_day',       '100',   'number',  'limits',   'Maximum messages a user can send per day'],

        // ── payment ──────────────────────────────────────────────────────────
        ['commission_rate',            '0.05',   'number',  'payment', 'Platform commission rate as a decimal (e.g. 0.05 = 5%)'],
        ['minimum_amount',             '100',    'number',  'payment', 'Minimum payment amount in KES'],
        ['maximum_amount',             '1000000','number',  'payment', 'Maximum payment amount in KES'],
        ['auto_approve_payments',      'false',  'boolean', 'payment', 'Auto-approve completed M-Pesa payments'],

        // ── email ────────────────────────────────────────────────────────────
        ['smtp_host',                  '""',    'string',  'email',    'SMTP server hostname (e.g. smtp.gmail.com)'],
        ['smtp_port',                  '587',   'number',  'email',    'SMTP server port'],
        ['smtp_username',              '""',    'string',  'email',    'SMTP authentication username / email'],
        ['smtp_password',              '""',    'string',  'email',    'SMTP authentication password'],
        ['enable_notifications',       'false', 'boolean', 'email',    'Enable outbound email notifications'],

        // ── notifications ────────────────────────────────────────────────────
        ['new_user_signup',    'true',  'boolean', 'notifications', 'Alert admin when a new user registers'],
        ['new_job_posted',     'false', 'boolean', 'notifications', 'Alert admin when a new job is posted'],
        ['payment_received',   'true',  'boolean', 'notifications', 'Alert admin when a payment is received'],
        ['system_alerts',      'true',  'boolean', 'notifications', 'Send system health alert notifications'],
        ['admin_email',        '""',    'string',  'notifications', 'Admin email address for notification delivery'],

        // ── security ─────────────────────────────────────────────────────────
        ['max_login_attempts',         '5',     'number',  'security', 'Maximum failed login attempts before lockout'],
        ['token_expiration',           '24',    'number',  'security', 'JWT token lifetime in hours'],
        ['require_email_verification', 'true',  'boolean', 'security', 'Require OTP email verification on signup'],
        ['enable_two_factor',          'false', 'boolean', 'security', 'Enable two-factor authentication'],

        // ── system ───────────────────────────────────────────────────────────
        ['backup_frequency',   '"daily"', 'string',  'system', 'Database backup schedule (daily/weekly/monthly)'],
        ['log_level',          '"info"',  'string',  'system', 'Application log verbosity (error/warn/info/debug)'],
        ['session_timeout',    '30',      'number',  'system', 'Idle session timeout in minutes'],
        ['enable_analytics',   'false',   'boolean', 'system', 'Enable analytics and usage tracking'],
        ['auto_cleanup_logs',  'false',   'boolean', 'system', 'Automatically remove old log files'],
    ];

    for (const [key, value, type, category, desc] of defaults) {
        await conn.query(
            'INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES (?, ?, ?, ?, ?)',
            [key, value, type, category, desc]
        );
    }

    console.log('  ✅  default system_settings seeded');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🐟  FishCrewConnect — Database Setup\n' + '─'.repeat(42));

    conn = await mysql.createConnection(config);

    if (skipDbCreate) {
        console.log(`\nDatabase: ${DB_NAME} (external — skipping CREATE DATABASE)\n`);
    } else {
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await conn.query(`USE \`${DB_NAME}\``);
        console.log(`\nDatabase: ${DB_NAME}\n`);
    }

    console.log('Creating tables...');
    await createTables();

    console.log('\nSeeding default data...');
    await seedDefaults();

    await conn.end();

    console.log(`\n${'─'.repeat(42)}`);
    if (failed === 0) {
        console.log(`✅  All ${passed} tables ready. Database setup complete!\n`);
    } else {
        console.log(`⚠️   ${passed} succeeded, ${failed} failed — check errors above.\n`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('\n❌  Fatal error:', err.message);
    process.exit(1);
});
