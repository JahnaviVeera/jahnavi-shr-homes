/*
  Warnings:

  - You are about to drop the `_ProjectMembers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProjectSupervisors` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `supervisors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerId` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supervisorId` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `supervisors` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectSupervisors" DROP CONSTRAINT "_ProjectSupervisors_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectSupervisors" DROP CONSTRAINT "_ProjectSupervisors_B_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "customerId" UUID NOT NULL,
ADD COLUMN     "supervisorId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "supervisors" ADD COLUMN     "userId" UUID NOT NULL;

-- DropTable
DROP TABLE "_ProjectMembers";

-- DropTable
DROP TABLE "_ProjectSupervisors";

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_userId_key" ON "supervisors"("userId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("supervisorId") ON DELETE RESTRICT ON UPDATE CASCADE;
