const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const user = await prisma.user.create({
            data: {
                userName: 'testdel',
                email: 'testdel@example.com',
                contact: '1234567890',
                role: 'customer',
                status: 'pending'
            }
        });

        await prisma.project.create({
            data: {
                projectName: 'P1',
                projectType: 'villa',
                location: 'loc',
                initialStatus: 'Inprogress',
                startDate: '2026-01-01',
                expectedCompletion: '2026-12-01',
                totalBudget: 1000,
                materialName: 'm',
                quantity: 1,
                notes: '',
                customerId: user.userId
            }
        });

        console.log('User and project created, attempting delete...');
        await prisma.user.delete({ where: { userId: user.userId } });
        console.log('Delete successful without constraint error!');
    } catch (err) {
        console.error('Constraint error details:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
