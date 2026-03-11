
import prisma from "./src/config/prisma.client";

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: "jahnavi.veeranala@example.com" }
    });

    if (user) {
        console.log(`VALID_USER_ID: ${user.userId}`);
    } else {
        // Fallback: get any user
        const anyUser = await prisma.user.findFirst();
        if (anyUser) {
            console.log(`VALID_USER_ID: ${anyUser.userId}`);
        } else {
            console.log("NO_USERS_FOUND");
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
