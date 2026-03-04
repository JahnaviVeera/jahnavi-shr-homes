const { Prisma } = require('@prisma/client');
console.log("Notification fields in Prisma client:");
// This might not work as easily in JS depending on how Prisma exports types
// But we can check the runtime metadata if available
// Or just try to create one
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log("Attempting to create a notification with referenceId...");
        // We'll use a non-existent userId to fail eventually, but check the validation error
        await prisma.notification.create({
            data: {
                userId: '00000000-0000-0000-0000-000000000000',
                message: 'Test',
                referenceId: 'test'
            }
        });
    } catch (error) {
        console.log("Error message:", error.message);
        if (error.message.includes("Unknown argument 'referenceId'")) {
            console.log("FAILURE: referenceId is NOT in the client");
        } else if (error.message.includes("Foreign key constraint fails")) {
            console.log("SUCCESS: referenceId is recognized (foreign key failed as expected)");
        } else {
            console.log("Other error:", error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

test();
