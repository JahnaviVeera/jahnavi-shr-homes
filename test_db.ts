import prisma from './src/config/prisma.client';
async function test() {
  try {
    const user = await prisma.user.findFirst();
    console.log('success', user?.email);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
