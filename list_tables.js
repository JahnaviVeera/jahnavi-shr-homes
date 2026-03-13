const { Pool } = require('pg');
const { config } = require('./src/config/env');

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function listTables() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        res.rows.forEach(r => console.log(r.table_name));
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listTables();
