const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config', '.env') });

async function listAll() {
    const connectionString = process.env.DATABASE_PUBLIC_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const users = await prisma.user.findMany();
        console.log('--- ALL USERS IN DB ---');
        users.forEach(u => {
            console.log(`ID: ${u.userId} | Email: "${u.email}" | Role: ${u.role} | Name: ${u.userName}`);
        });
        console.log('--- END OF LIST ---');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listAll();
