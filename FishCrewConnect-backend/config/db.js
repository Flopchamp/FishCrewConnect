const mysql = require('mysql2');
require('dotenv').config(); // To access environment variables
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection (optional, but good for immediate feedback)
pool.getConnection((err, connection) => {
  if (err) {
    logger.error('Error connecting to MySQL database:', err.stack);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      logger.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      logger.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      logger.error('Database connection was refused. Check if server is running and port is correct.');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('Database access denied. Check username and password.');
    }
    // You might want to exit the process if the DB connection fails critically on startup
    // process.exit(1);
    return;
  }
  if (connection) {
    connection.release(); // Release the connection back to the pool
    logger.info('Successfully connected to MySQL database.');
  }
});

const promisePool = pool.promise();

process.on('SIGINT', () => {
    pool.end(() => {
        logger.info('Database pool closed.');
        process.exit(0);
    });
});

module.exports = promisePool;
