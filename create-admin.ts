import bcrypt from 'bcrypt';
import Prisma from './src/config/prisma.client';

async function createAdmin() {
    try {
        // Hash the password
        const password = 'Adminshr@123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Creating admin user...');

        // Use raw SQL to insert admin
        await Prisma.$executeRaw`
            INSERT INTO users (
                "userId",
                "userName",
                role,
                email,
                password,
                contact,
                status,
                "companyName",
                timezone,
                currency,
                language,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'Super Admin',
                'admin'::users_role_enum,
                'admin@shrhomes.com',
                ${hashedPassword},
                '9876543210',
                'Active'::users_status_enum,
                'SHR Homes',
                'UTC'::users_timezone_enum,
                'USD'::users_currency_enum,
                'English'::users_language_enum,
                NOW(),
                NOW()
            )
        `;

        console.log('✅ Admin user created successfully!');
        console.log('Email: admin@shrhomes.com');
        console.log('Password: Adminshr@123!');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await Prisma.$disconnect();
    }
}

createAdmin();
