const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function createUserProfilesTable() {
  try {
    console.log('Creating user_profiles table...');
    
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'create_profiles_table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL
    await db.query(sql);
    
    console.log('User profiles table created or already exists');
  } catch (err) {
    console.error('Error creating user_profiles table:', err);
  } finally {
    process.exit(0);
  }
}

createUserProfilesTable();
