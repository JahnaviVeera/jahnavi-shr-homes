/*
  Warnings:

  - You are about to drop the column `imageName` on the `daily_updates` table. All the data in the column will be lost.
  - You are about to drop the column `imageType` on the `daily_updates` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `daily_updates` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `daily_updates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_updates" DROP COLUMN "imageName",
DROP COLUMN "imageType",
DROP COLUMN "imageUrl",
DROP COLUMN "videoUrl",
ADD COLUMN     "image_id" VARCHAR(255),
ADD COLUMN     "image_name" VARCHAR(255),
ADD COLUMN     "image_type" VARCHAR(100),
ADD COLUMN     "image_url" VARCHAR(500),
ADD COLUMN     "video_id" VARCHAR(255),
ADD COLUMN     "video_url" VARCHAR(500);
