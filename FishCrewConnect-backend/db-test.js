const db = require('./config/db');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
      // Test if we can connect and execute a simple query
    const [rows] = await db.query('SELECT NOW() as now_time');
    console.log('Database connected successfully!');
    console.log('Current database time:', rows[0].now_time);
    
    // Check if jobs table exists and fetch a sample
    try {
      console.log('\nChecking jobs table...');
      const [jobs] = await db.query('SELECT * FROM jobs LIMIT 3');
      console.log(`Found ${jobs.length} jobs in the database.`);
      if (jobs.length > 0) {
        console.log('Sample job:', jobs[0]);
      }
    } catch (error) {
      console.error('Error checking jobs table:', error.message);
    }
    
    // Check if users table exists and fetch count
    try {
      console.log('\nChecking users table...');
      const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
      console.log(`Total users in database: ${userCount[0].count}`);
    } catch (error) {
      console.error('Error checking users table:', error.message);
    }
    
    // Check if reviews table exists and fetch count
    try {
      console.log('\nChecking reviews table...');
      const [reviewCount] = await db.query('SELECT COUNT(*) as count FROM reviews');
      console.log(`Total reviews in database: ${reviewCount[0].count}`);
    } catch (error) {
      console.error('Error checking reviews table:', error.message);
    }
    
    console.log('\nDatabase check completed!');
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    // Close the connection pool
    process.exit(0);
  }
}

testDatabaseConnection();
