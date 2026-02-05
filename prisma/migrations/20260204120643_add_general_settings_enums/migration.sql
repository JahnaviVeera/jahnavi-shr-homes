/*
  Warnings:

  - The `currency` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `language` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `timezone` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "timezones_enum" AS ENUM ('Eastern Time (ET)', 'Central Time (CT)', 'Mountain Time (MT)', 'Pacific Time (PT)', 'UTC');

-- CreateEnum
CREATE TYPE "currencies_enum" AS ENUM ('USD ($)', 'EUR (€)', 'GBP (£)');

-- CreateEnum
CREATE TYPE "languages_enum" AS ENUM ('English', 'Spanish', 'French');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "feedback" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" VARCHAR(255),
DROP COLUMN "currency",
ADD COLUMN     "currency" "currencies_enum" DEFAULT 'USD ($)',
DROP COLUMN "language",
ADD COLUMN     "language" "languages_enum" DEFAULT 'English',
DROP COLUMN "timezone",
ADD COLUMN     "timezone" "timezones_enum" DEFAULT 'UTC';
