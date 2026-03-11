/*
  Warnings:

  - The values [plans,permit,others] on the enum `documents_documenttype_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Villa,Apartment,Residential,Commercial,Industrial] on the enum `projects_projecttype_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "users_status_enum" AS ENUM ('Active', 'Inactive');

-- AlterEnum
BEGIN;
CREATE TYPE "documents_documenttype_enum_new" AS ENUM ('Agreement', 'Plans', 'Permit', 'Other');
ALTER TABLE "public"."documents" ALTER COLUMN "documentType" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "documentType" TYPE "documents_documenttype_enum_new" USING ("documentType"::text::"documents_documenttype_enum_new");
ALTER TYPE "documents_documenttype_enum" RENAME TO "documents_documenttype_enum_old";
ALTER TYPE "documents_documenttype_enum_new" RENAME TO "documents_documenttype_enum";
DROP TYPE "public"."documents_documenttype_enum_old";
ALTER TABLE "documents" ALTER COLUMN "documentType" SET DEFAULT 'Agreement';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "projects_projecttype_enum_new" AS ENUM ('villa', 'apartment', 'residential', 'commercial', 'industrial');
ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "projects_projecttype_enum_new" USING ("projectType"::text::"projects_projecttype_enum_new");
ALTER TYPE "projects_projecttype_enum" RENAME TO "projects_projecttype_enum_old";
ALTER TYPE "projects_projecttype_enum_new" RENAME TO "projects_projecttype_enum";
DROP TYPE "public"."projects_projecttype_enum_old";
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "users_status_enum" NOT NULL DEFAULT 'Active';

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
