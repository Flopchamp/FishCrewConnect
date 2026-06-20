require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB_NAME,
        port: process.env.MYSQL_PORT || 3306,
    });

    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS token_blacklist (
                jti        VARCHAR(36)  NOT NULL PRIMARY KEY,
                expires_at DATETIME     NOT NULL,
                created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅  token_blacklist table created (or already exists).');
    } finally {
        await conn.end();
    }
}

run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
