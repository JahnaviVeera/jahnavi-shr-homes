/*
  Warnings:

  - You are about to drop the column `supervisorId` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "supervisorId",
ADD COLUMN     "currency" VARCHAR(20) DEFAULT 'USD',
ADD COLUMN     "language" VARCHAR(50) DEFAULT 'English',
ADD COLUMN     "projectId" UUID,
ADD COLUMN     "timezone" VARCHAR(100) DEFAULT 'UTC';

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
