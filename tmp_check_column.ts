import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const tableInfo = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Payment'`;
        console.log('Payment Columns:', tableInfo);
    } catch (e) {
        console.error('Error fetching columns:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
