
import prisma from "./src/config/prisma.client";

async function main() {
    const users = await prisma.user.findMany({
        take: 5,
        select: { userId: true, userName: true, email: true, role: true }
    });

    console.log("--- AVAILABLE USERS ---");
    if (users.length === 0) {
        console.log("No users found in database!");
    } else {
        users.forEach(u => {
            console.log(`ID: ${u.userId} | Name: ${u.userName} | Role: ${u.role}`);
        });
    }
    console.log("-----------------------");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
