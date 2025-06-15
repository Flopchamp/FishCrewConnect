const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function createMessagesTable() {
    try {
        console.log('Creating messages table...');
        const sql = fs.readFileSync(path.join(__dirname, 'create_messages_table.sql'), 'utf8');
        await db.query(sql);
        console.log('Messages table created successfully!');
    } catch (error) {
        console.error('Error creating messages table:', error);
    } finally {
        process.exit();
    }
}

createMessagesTable();
