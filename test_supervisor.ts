import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const supervisorId = "5aef9325-5c3f-41af-af68-cc1915e02e04"; // From user's log

    const projects = await prisma.project.findMany({
        where: { supervisorId }
    });

    console.log("All projects for this supervisor:", projects.map(p => ({
        id: p.projectId,
        status: p.initialStatus,
        progress: p.progress
    })));

    const completed = await prisma.project.count({
        where: { supervisorId, initialStatus: 'Completed' }
    });
    console.log("Count with status 'Completed':", completed);
}
main().finally(() => prisma.$disconnect());
