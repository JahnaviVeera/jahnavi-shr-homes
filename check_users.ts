import prisma from "./src/config/prisma.client";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      userName: true,
      role: true,
      email: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
