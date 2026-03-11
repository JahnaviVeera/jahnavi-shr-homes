import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany();
    console.log('Total Users:', users.length);
    console.log('Users:', JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

checkUsers();
