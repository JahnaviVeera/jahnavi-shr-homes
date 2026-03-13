import prisma from './src/config/prisma.client';

async function verify() {
  try {
    const dailyUpdates = await prisma.dailyUpdate.findMany({ take: 1 });
    console.log('Daily Update Fetch OK');
  } catch (e: any) {
    console.error('Daily Update Fetch Failed:', e.message);
  }

  try {
    const projects = await prisma.project.findMany({ 
      take: 1,
      include: { dailyUpdates: true }
    });
    console.log('Project Fetch OK');
  } catch (e: any) {
    console.error('Project Fetch Failed:', e.message);
  }
}

verify().finally(() => prisma.$disconnect());
