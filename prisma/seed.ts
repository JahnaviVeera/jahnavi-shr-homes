import { PrismaClient, UserRole, ProjectType, ProjectStatus, SupervisorStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    try {
        // 1. Create Default Customer (Required for Projects)
        const customerEmail = 'customer@example.com';
        let customer = await prisma.user.findFirst({ where: { email: customerEmail } });

        if (!customer) {
            console.log('Creating default customer...');
            customer = await prisma.user.create({
                data: {
                    userName: 'Default Customer',
                    email: customerEmail,
                    role: UserRole.user,
                    contact: '1234567890',
                    password: await bcrypt.hash('password', 10)
                }
            });
        }

        const customerId = customer.userId;

        // 2. Create Projects
        console.log('Creating projects...');
        const projectsData = [
            {
                name: 'Sunrise Villa',
                data: {
                    projectName: 'Sunrise Villa',
                    projectType: ProjectType.villa,
                    location: 'Hyderabad',
                    initialStatus: ProjectStatus.Inprogress,
                    startDate: new Date(),
                    expectedCompletion: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    totalBudget: 5000000,
                    materialName: 'Cement',
                    quantity: 1000,
                    notes: 'Luxury villa project',
                    customerId: customerId
                }
            },
            {
                name: 'Skyline Apartments',
                data: {
                    projectName: 'Skyline Apartments',
                    projectType: ProjectType.apartment,
                    location: 'Bangalore',
                    initialStatus: ProjectStatus.Planning,
                    startDate: new Date(),
                    expectedCompletion: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
                    totalBudget: 15000000,
                    materialName: 'Steel',
                    quantity: 5000,
                    notes: 'High-rise apartment complex',
                    customerId: customerId
                }
            }
        ];

        const projectMap = new Map();

        for (const p of projectsData) {
            let project = await prisma.project.findFirst({ where: { projectName: p.name } });
            if (project) {
                // Update to ensure consistency
                project = await prisma.project.update({
                    where: { projectId: project.projectId },
                    data: p.data
                });
            } else {
                project = await prisma.project.create({
                    data: p.data
                });
            }
            projectMap.set(p.name, project);
        }

        console.log(`Projects ready.`);

        // 3. Create Supervisors (and their User accounts)
        const saltRounds = 10;
        const plainPassword = 'Password@123';
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        const supervisorsData = [
            { name: 'John Doe', email: 'john.doe@example.com', phone: '9876543210' },
            { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '9876543211' },
            { name: 'Robert Brown', email: 'robert.brown@example.com', phone: '9876543212' },
            { name: 'Supervisor 4', email: 'supervisor4@example.com', phone: '9876543213' }
        ];

        for (const s of supervisorsData) {
            // Find existing user
            let user = await prisma.user.findFirst({ where: { email: s.email } });

            if (user) {
                // Update existing user (Critical Fix: Reset password)
                user = await prisma.user.update({
                    where: { userId: user.userId },
                    data: {
                        password: hashedPassword,
                        role: UserRole.supervisor,
                        contact: s.phone,
                        userName: s.name
                    }
                });
            } else {
                // Create new user
                user = await prisma.user.create({
                    data: {
                        userName: s.name,
                        email: s.email,
                        password: hashedPassword,
                        role: UserRole.supervisor,
                        contact: s.phone
                    }
                });
            }

            // Find existing supervisor
            let supervisor = await prisma.supervisor.findFirst({ where: { userId: user.userId } });

            if (supervisor) {
                await prisma.supervisor.update({
                    where: { supervisorId: supervisor.supervisorId },
                    data: {
                        fullName: s.name,
                        phoneNumber: s.phone,
                        status: SupervisorStatus.Active,
                        projects: {
                            connect: [
                                { projectId: projectMap.get('Sunrise Villa').projectId },
                                { projectId: projectMap.get('Skyline Apartments').projectId }
                            ]
                        }
                    }
                });
            } else {
                await prisma.supervisor.create({
                    data: {
                        fullName: s.name,
                        email: s.email,
                        phoneNumber: s.phone,
                        password: hashedPassword,
                        status: SupervisorStatus.Active,
                        userId: user.userId,
                        projects: {
                            connect: [
                                { projectId: projectMap.get('Sunrise Villa').projectId },
                                { projectId: projectMap.get('Skyline Apartments').projectId }
                            ]
                        }
                    }
                });
            }

            console.log(`Supervisor ready: ${s.email}`);
        }

        console.log('Seeding finished successfully.');
    } catch (error) {
        console.error('Error seeding data:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
