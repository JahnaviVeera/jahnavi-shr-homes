const { Pool } = require('pg');
const { config } = require('./src/config/env');

const connectionString = config.DATABASE_PUBLIC_URL || config.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function applyFixes() {
    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        console.log('Adding "Others" to ConstructionStage enum...');
        try {
            await client.query(`ALTER TYPE daily_updates_constructionstage_enum ADD VALUE 'Others'`);
            console.log('Added "Others" successfully');
        } catch (e) {
            if (e.code === '42710') { // duplicate_object
                console.log('"Others" already exists in enum');
            } else {
                throw e;
            }
        }

        console.log('Adding "work_completed" column to daily_updates...');
        try {
            // Since some columns in this table are CamelCase and some are snake_case,
            // let's check what the schema expects. 
            // Schema has: @map("work_completed")
            // So column should be "work_completed" (lowercase snake_case)
            await client.query(`ALTER TABLE daily_updates ADD COLUMN work_completed VARCHAR(255)`);
            console.log('Added "work_completed" successfully');
        } catch (e) {
            if (e.code === '42701') { // duplicate_column
                console.log('"work_completed" already exists');
            } else {
                throw e;
            }
        }

        client.release();
    } catch (err) {
        console.error('Error applying fixes:', err);
    } finally {
        await pool.end();
    }
}

applyFixes();
