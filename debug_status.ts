import prisma from './src/config/prisma.client';

async function checkData() {
    try {
        const projects = await prisma.project.findMany({
            select: {
                projectId: true,
                projectName: true,
                initialStatus: true
            }
        });
        console.log('--- Projects ---');
        console.log(JSON.stringify(projects, null, 2));

        const userCount = await prisma.user.count();
        console.log('Total Users:', userCount);

        const statuses = await prisma.project.groupBy({
            by: ['initialStatus'],
            _count: true
        });
        console.log('Status breakdown:', JSON.stringify(statuses, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
