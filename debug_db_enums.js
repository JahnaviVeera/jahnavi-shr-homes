const { Pool } = require('pg');
const { config } = require('./src/config/env');

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkEnums() {
    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        const enums = [
            'daily_updates_constructionstage_enum',
            'daily_updates_status_enum',
            'users_role_enum',
            'projects_initialstatus_enum',
            'supervisors_status_enum'
        ];
        
        for (const enumName of enums) {
            console.log(`\nEnum: ${enumName}`);
            const res = await client.query(`
                SELECT enumlabel 
                FROM pg_enum 
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                WHERE pg_type.typname = $1
                ORDER BY enumsortorder;
            `, [enumName]);
            
            res.rows.forEach(row => {
                console.log(`- ${row.enumlabel}`);
            });
        }

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkEnums();
