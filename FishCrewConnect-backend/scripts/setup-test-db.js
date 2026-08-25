// Creates (or recreates) the schema in the *test* database only.
// Refuses to touch anything not named like a test database.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.MYSQL_TEST_DATABASE || 'fishcrewconnect_test';

if (!/test/i.test(DB_NAME)) {
    console.error(`Refusing to run: "${DB_NAME}" is not a test database name.`);
    process.exit(1);
}

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        port: process.env.MYSQL_PORT || 3306,
        multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await conn.query(`USE \`${DB_NAME}\``);
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await conn.query(schema);
    console.log(`Schema loaded into ${DB_NAME}`);
    await conn.end();
})().catch(err => {
    console.error('Test DB setup failed:', err.message);
    process.exit(1);
});
