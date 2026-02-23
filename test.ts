import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();
prisma.dailyUpdate.findMany({
    take: 5
}).then(d => {
    console.log("DATA:", JSON.stringify(d, null, 2));
    console.log("TYPES:");
    d.forEach(u => console.log(typeof u.rawMaterials, JSON.stringify(u.rawMaterials)));
    prisma.$disconnect();
});
