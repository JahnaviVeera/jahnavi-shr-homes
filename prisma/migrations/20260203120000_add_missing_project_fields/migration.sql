-- AlterTable
ALTER TABLE "projects" ADD COLUMN "project_manager" VARCHAR(255);
ALTER TABLE "projects" ADD COLUMN "area" VARCHAR(100);
ALTER TABLE "projects" ADD COLUMN "number_of_floors" INTEGER;
ALTER TABLE "projects" ADD COLUMN "priority" VARCHAR(50) DEFAULT 'Medium';
ALTER TABLE "projects" ADD COLUMN "currency" VARCHAR(20) DEFAULT 'INR';
ALTER TABLE "projects" ADD COLUMN "description" TEXT;

-- AlterEnum
ALTER TYPE "projects_initialstatus_enum" ADD VALUE IF NOT EXISTS 'Completed';
