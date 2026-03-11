-- AlterEnum
ALTER TYPE "projects_initialstatus_enum" ADD VALUE 'Completed';

-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "rating" DECIMAL(2,1) DEFAULT 0.0;
