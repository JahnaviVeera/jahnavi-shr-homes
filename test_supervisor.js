const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const supervisorId = "5aef9325-5c3f-41af-af68-cc1915e02e04"; // From user's log

    const projects = await prisma.project.findMany({
        where: { supervisorId }
    });

    console.log("All projects for this supervisor:");
    projects.forEach(p => console.log(`Project ID: ${p.projectId}, initialStatus: ${p.initialStatus}, progress: ${p.progress}`));

    const completed = await prisma.project.count({
        where: { supervisorId, initialStatus: 'Completed' }
    });
    console.log("Count with status 'Completed':", completed);
}

main().catch(console.error).finally(() => prisma.$disconnect());
