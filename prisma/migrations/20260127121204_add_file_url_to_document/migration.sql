-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "fileUrl" TEXT,
ALTER COLUMN "fileData" DROP NOT NULL;
