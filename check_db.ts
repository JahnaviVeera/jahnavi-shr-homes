import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    try {
        const projects = await prisma.project.findMany({
            include: {
                customer: true
            }
        });
        console.log('Total Projects:', projects.length);
        console.log('Project Statuses:', projects.map(p => p.initialStatus));

        const users = await prisma.user.findMany();
        console.log('Total Users:', users.length);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
