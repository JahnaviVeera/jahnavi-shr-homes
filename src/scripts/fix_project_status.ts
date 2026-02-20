
import prisma from '../config/prisma.client';
import { Prisma } from '@prisma/client';

async function main() {
    console.log('Starting data migration for ProjectStatus...');

    try {
        // Update 'Planning' -> 'Inprogress'
        // Using executeRawUnsafe to bypass Prisma Client validation in case of schema mismatches
        // and to operate directly on the database status.
        const resultPlanning = await prisma.$executeRawUnsafe(`
      UPDATE "projects" 
      SET "initialStatus" = 'Inprogress' 
      WHERE "initialStatus" = 'Planning'
    `);
        console.log(`Updated projects from 'Planning' to 'Inprogress': ${resultPlanning}`);

        // Update 'complete' -> 'Completed'
        const resultComplete = await prisma.$executeRawUnsafe(`
      UPDATE "projects" 
      SET "initialStatus" = 'Completed' 
      WHERE "initialStatus" = 'complete'
    `);
        console.log(`Updated projects from 'complete' to 'Completed': ${resultComplete}`);

    } catch (error) {
        console.error('Error updating project statuses:', error);
    } finally {
        // We import the instance so we shouldn't necessarily disconnect it if it's used elsewhere,
        // but in a script it's fine.
        await prisma.$disconnect();
    }
}

main();
