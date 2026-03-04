require('dotenv').config({ path: 'src/config/.env' });
const prisma = require('./src/config/prisma.client').default;
const DailyUpdatesServices = require('./src/modules/daily-updates/daily-updates.services');

async function test() {
    const projectId = "35007307-2cf2-4fc4-9398-7140ee7d2eb0";
    const stage = "Foundation";
    const supervisorId = "5aef9325-5c3f-41af-af68-cc1915e02e04";

    try {
        console.log("Calling markStageComplete...");
        const result = await DailyUpdatesServices.markStageComplete(projectId, stage, supervisorId);
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
