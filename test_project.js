require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findUnique({
        where: { projectId: "35007307-2cf2-4fc4-9398-7140ee7d2eb0" }
    });

    console.log("Project:", project);
}

main().catch(console.error).finally(() => prisma.$disconnect());
