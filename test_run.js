const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.dailyUpdate.findMany();
    console.log('daily ok');
  } catch(e) {
    console.error('Daily update error:', e.message);
  }
  
  try {
    await prisma.project.findMany();
    console.log('project ok');
  } catch(e) {
    console.error('Project error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
