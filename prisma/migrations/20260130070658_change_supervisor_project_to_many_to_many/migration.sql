/*
  Warnings:

  - You are about to drop the column `projectId` on the `supervisors` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "supervisors" DROP CONSTRAINT "supervisors_projectId_fkey";

-- AlterTable
ALTER TABLE "supervisors" DROP COLUMN "projectId";

-- CreateTable
CREATE TABLE "_ProjectSupervisors" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProjectSupervisors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProjectSupervisors_B_index" ON "_ProjectSupervisors"("B");

-- AddForeignKey
ALTER TABLE "_ProjectSupervisors" ADD CONSTRAINT "_ProjectSupervisors_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectSupervisors" ADD CONSTRAINT "_ProjectSupervisors_B_fkey" FOREIGN KEY ("B") REFERENCES "supervisors"("supervisorId") ON DELETE CASCADE ON UPDATE CASCADE;
