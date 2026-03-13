const { Pool } = require('pg');
const { config } = require('./src/config/env');

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkColumns() {
    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        const tables = ['daily_updates', 'projects', 'supervisors', 'users'];
        
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            
            res.rows.forEach(row => {
                console.log(`- ${row.column_name}: ${row.data_type}`);
            });
        }

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
