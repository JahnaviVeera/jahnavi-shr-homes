-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "file_id" VARCHAR(255),
ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "file_type" VARCHAR(100),
ADD COLUMN     "file_url" TEXT;
