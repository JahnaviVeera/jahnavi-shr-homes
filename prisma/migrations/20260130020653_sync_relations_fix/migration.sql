-- AddForeignKey
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;
