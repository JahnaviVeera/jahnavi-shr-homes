import Prisma from "./src/config/prisma.client";

async function main() {
    console.log('Starting data migration...');

    // 1. Update all users with 'Active' status to 'inprogress'
    const activeUpdateResult = await Prisma.user.updateMany({
        where: {
            status: 'Active' as any,
        },
        data: {
            status: 'inprogress' as any,
        },
    });
    console.log(`Updated ${activeUpdateResult.count} users from 'Active' to 'inprogress'.`);

    // 2. Update all users with 'Inactive' status to 'completed'
    const inactiveUpdateResult = await Prisma.user.updateMany({
        where: {
            status: 'Inactive' as any,
        },
        data: {
            status: 'completed' as any,
        },
    });
    console.log(`Updated ${inactiveUpdateResult.count} users from 'Inactive' to 'completed'.`);

    console.log('Data migration finished successfully.');
}

main()
    .catch((e) => {
        console.error('Error during data migration:', e);
        process.exit(1);
    });
