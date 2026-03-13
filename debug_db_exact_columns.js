const { Pool } = require('pg');
const { config } = require('./src/config/env');

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkExactColumns() {
    try {
        const client = await pool.connect();
        const tables = ['daily_updates', 'projects', 'supervisors'];
        
        for (const table of tables) {
            console.log(`\nExact Columns for ${table}:`);
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            
            res.rows.forEach(row => {
                console.log(`'${row.column_name}'`);
            });
        }

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkExactColumns();
