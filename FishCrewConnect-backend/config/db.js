const mysql = require('mysql2');
require('dotenv').config(); // To access environment variables

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB_NAME,
  port: process.env.MYSQL_PORT || 3306, // Use port from .env or default to 3306
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection (optional, but good for immediate feedback)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err.stack);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused. Check if server is running and port is correct.');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Database access denied. Check username and password.');
    }
    // You might want to exit the process if the DB connection fails critically on startup
    // process.exit(1);
    return;
  }
  if (connection) {
    connection.release(); // Release the connection back to the pool
    console.log('Successfully connected to MySQL database.');
  }
});

module.exports = pool.promise(); // Export the pool with promise support
