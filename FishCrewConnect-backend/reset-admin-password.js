const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function resetAdminPassword() {
    const adminEmail = 'admin@fishcrewconnect.com';
    const newPassword = 'admin123'; // Change this to your preferred password

    try {
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        // Update admin password
        const [result] = await db.query(`
            UPDATE users 
            SET password_hash = ?, updated_at = NOW() 
            WHERE email = ? AND user_type = 'admin'
        `, [password_hash, adminEmail]);

        if (result.affectedRows > 0) {
            console.log('✅ Admin password reset successfully!');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 New Password:', newPassword);
            console.log('🚨 IMPORTANT: Change the password after logging in!');
            console.log('');
            console.log('You can now log in to the admin dashboard at: http://localhost:3002');
        } else {
            console.log('❌ Admin user not found');
        }
        
    } catch (error) {
        console.error('❌ Error resetting admin password:', error.message);
    } finally {
        process.exit(0);
    }
}

resetAdminPassword();
