const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function createAdminUser() {
    const adminEmail = process.argv[2] || 'admin@fishcrewconnect.com';
    const adminPassword = process.argv[3];
    const adminName = process.argv[4] || 'System Administrator';

    if (!adminPassword) {
        console.error('Usage: node create-admin.js <email> <password> [name]');
        console.error('Example: node create-admin.js admin@example.com MySecurePass123');
        process.exit(1);
    }

    if (adminPassword.length < 8) {
        console.error('Password must be at least 8 characters.');
        process.exit(1);
    }

    try {
        const [existingAdmin] = await db.query(
            'SELECT email FROM users WHERE email = ? OR user_type = ?',
            [adminEmail, 'admin']
        );

        if (existingAdmin.length > 0) {
            console.log('Admin user already exists.');
            console.log('Email:', existingAdmin[0].email);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(adminPassword, salt);

        await db.query(
            `INSERT INTO users (name, email, password_hash, user_type, verification_status, created_at, updated_at)
             VALUES (?, ?, ?, 'admin', 'verified', NOW(), NOW())`,
            [adminName, adminEmail, password_hash]
        );

        console.log('Admin user created successfully.');
        console.log('Email:', adminEmail);
        console.log('Name:', adminName);

    } catch (error) {
        console.error('Error creating admin user:', error.message);
    } finally {
        process.exit(0);
    }
}

createAdminUser();
