import Prisma from "./src/config/prisma.client";

async function main() {
    console.log("Checking Prisma client properties...");
    console.log("Keys in Prisma:", Object.keys(Prisma));
    if ((Prisma as any).tokenBlacklist) {
        console.log("tokenBlacklist EXISTS");
    } else {
        console.log("tokenBlacklist DOES NOT EXIST");
    }
}

main().catch(console.error);
