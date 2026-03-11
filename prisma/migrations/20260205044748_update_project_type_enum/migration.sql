/*
  Warnings:

  - The values [building] on the enum `projects_projecttype_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "projects_projecttype_enum_new" AS ENUM ('villa', 'apartment', 'residential', 'commercial', 'industrial');
ALTER TABLE "projects" ALTER COLUMN "projectType" TYPE "projects_projecttype_enum_new" USING ("projectType"::text::"projects_projecttype_enum_new");
ALTER TYPE "projects_projecttype_enum" RENAME TO "projects_projecttype_enum_old";
ALTER TYPE "projects_projecttype_enum_new" RENAME TO "projects_projecttype_enum";
DROP TYPE "public"."projects_projecttype_enum_old";
COMMIT;
