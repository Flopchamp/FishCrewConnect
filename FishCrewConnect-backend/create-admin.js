const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function createAdminUser() {
    const adminEmail = 'admin@fishcrewconnect.com';
    const adminPassword = 'admin123'; // Change this to a secure password
    const adminName = 'System Administrator';

    try {
        // Check if admin already exists
        const [existingAdmin] = await db.query('SELECT email FROM users WHERE email = ? OR user_type = ?', [adminEmail, 'admin']);
        
        if (existingAdmin.length > 0) {
            console.log('❌ Admin user already exists!');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Try logging in with your existing admin credentials');
            process.exit(0);
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(adminPassword, salt);

        // Create admin user
        const [result] = await db.query(`
            INSERT INTO users (name, email, password_hash, user_type, verification_status, status, created_at, updated_at)
            VALUES (?, ?, ?, 'admin', 'verified', 'active', NOW(), NOW())
        `, [adminName, adminEmail, password_hash]);

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        console.log('🚨 IMPORTANT: Change the password after first login!');
        console.log('');
        console.log('You can now log in to the admin dashboard at: http://localhost:3002');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        process.exit(0);
    }
}

createAdminUser();
