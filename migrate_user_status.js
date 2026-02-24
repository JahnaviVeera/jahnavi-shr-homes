require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting data migration...');

    // 1. Update all users with 'Active' status to 'inprogress'
    const activeUpdateResult = await prisma.user.updateMany({
        where: {
            status: 'Active',
        },
        data: {
            status: 'inprogress',
        },
    });
    console.log(`Updated ${activeUpdateResult.count} users from 'Active' to 'inprogress'.`);

    // 2. Update all users with 'Inactive' status to 'completed'
    const inactiveUpdateResult = await prisma.user.updateMany({
        where: {
            status: 'Inactive',
        },
        data: {
            status: 'completed',
        },
    });
    console.log(`Updated ${inactiveUpdateResult.count} users from 'Inactive' to 'completed'.`);

    console.log('Data migration finished successfully.');
}

main()
    .catch((e) => {
        console.error('Error during data migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
