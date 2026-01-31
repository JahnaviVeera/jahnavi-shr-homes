import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    // Try to update a project with supervisorId
    try {
        await (prisma.project as any).update({
            where: { projectId: 'some-id' },
            data: { supervisorId: 'some-guid' }
        });
    } catch (e) {
        // We expect an error because the ID doesn't exist, but we check if the error is about the field
        console.log(e.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
