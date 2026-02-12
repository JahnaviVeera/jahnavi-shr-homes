// import prisma from '../config/prisma.client';
// import * as bcrypt from 'bcrypt';
// import { UserRole } from '@prisma/client';
// import logger from '../utils/logger';

// async function seedAdmin() {
//     const email = process.env.ADMIN_EMAIL;
//     const password = process.env.ADMIN_PASSWORD;

//     if (!email || !password) {
//         logger.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
//         logger.warn('Skipping admin seeding.');
//         return;
//     }

//     try {
//         const existingAdmin = await prisma.user.findFirst({
//             where: { email },
//         });

//         if (existingAdmin) {
//             // Optionally update password if env changes? No, safer to leave it.
//             logger.info('Admin user already exists. Skipping creation.');
//             return;
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const admin = await prisma.user.create({
//             data: {
//                 userName: 'Admin',
//                 email,
//                 password: hashedPassword,
//                 role: UserRole.admin,
//                 contact: '0000000000', // Dummy contact
//                 companyName: 'Shr Homes',
//             },
//         });

//         logger.info(`Admin user created successfully: ${admin.email}`);
//     } catch (error) {
//         logger.error('Error seeding admin user:', error);
//         process.exit(1);
//     }
// }

// seedAdmin()
//     .catch((e) => {
//         logger.error(e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });
