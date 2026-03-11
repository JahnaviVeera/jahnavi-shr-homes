import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'john.doe@example.com';
    console.log(`Checking user: ${email}`);

    // Find user by email (insensitive)
    const user = await prisma.user.findFirst({
        where: {
            email: { equals: email, mode: 'insensitive' }
        }
    });

    if (user) {
        console.log(`User found:`);
        console.log(`- ID: ${user.userId}`);
        console.log(`- Role: ${user.role}`);
        console.log(`- Password Hash exists: ${!!user.password}`);

        if (user.password) {
            const match = await bcrypt.compare('Password@123', user.password);
            console.log(`- Password 'Password@123' matches: ${match}`);
        }
    } else {
        console.log(`User ${email} NOT found.`);
        const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });
        console.log('Available users:', allUsers);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
