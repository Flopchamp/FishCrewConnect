const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateNotificationsSchema() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '4885',
      database: process.env.MYSQL_DB_NAME || 'fishcrewconnect',
    });

    console.log('Connected to database successfully!');

    // Show current schema
    console.log('\n=== BEFORE UPDATE ===');
    const [beforeSchema] = await connection.query('DESCRIBE notifications');
    console.table(beforeSchema);

    // Update the ENUM to include payment notification types
    console.log('\nUpdating notifications table ENUM...');
    await connection.query(`
      ALTER TABLE notifications 
      MODIFY COLUMN type ENUM(
        'new_application',
        'application_update', 
        'new_review',
        'new_message',
        'payment_initiated',
        'payment_completed',
        'payment_failed'
      ) NOT NULL
    `);

    console.log('✅ Notifications table updated successfully!');

    // Show updated schema
    console.log('\n=== AFTER UPDATE ===');
    const [afterSchema] = await connection.query('DESCRIBE notifications');
    console.table(afterSchema);

    // Show existing notification types
    console.log('\n=== EXISTING NOTIFICATION TYPES ===');
    const [existingTypes] = await connection.query(`
      SELECT type, COUNT(*) as count 
      FROM notifications 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.table(existingTypes);

    console.log('\n🎉 Schema update completed successfully!');
    console.log('Payment notifications should now work properly.');

  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

updateNotificationsSchema();
