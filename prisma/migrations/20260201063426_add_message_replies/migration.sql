-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "parentId" UUID;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "messages"("messageId") ON DELETE SET NULL ON UPDATE CASCADE;
