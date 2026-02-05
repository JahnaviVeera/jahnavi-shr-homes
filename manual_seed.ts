
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const connectionString = "postgresql://postgres:pXfPBeWvOitFqBscMvYFmDYYsYjKzKID@caboose.proxy.rlwy.net:58514/railway"

async function manualSeed() {
    console.log("Starting manual seed...");
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const admin = await prisma.user.create({
            data: {
                userName: 'Admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: UserRole.admin,
                contact: '0000000000',
                companyName: 'Shr Homes',
                timezone: 'UTC',
                currency: 'USD',
                language: 'English'
            },
        });
        console.log("Admin created:", admin.email);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

manualSeed();
