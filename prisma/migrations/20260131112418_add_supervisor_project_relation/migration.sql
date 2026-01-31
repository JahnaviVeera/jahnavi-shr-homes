-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "projectId" UUID;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("supervisorId") ON DELETE SET NULL ON UPDATE CASCADE;
