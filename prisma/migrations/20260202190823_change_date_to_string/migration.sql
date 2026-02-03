-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "date" TYPE VARCHAR(10) USING "date"::text;

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "date" TYPE VARCHAR(10) USING "date"::text;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "paymentDate" TYPE VARCHAR(10) USING "paymentDate"::text;

-- AlterTable
ALTER TABLE "projects" 
  ALTER COLUMN "startDate" TYPE VARCHAR(10) USING "startDate"::text,
  ALTER COLUMN "expectedCompletion" TYPE VARCHAR(10) USING "expectedCompletion"::text;

-- AlterTable
ALTER TABLE "quotations" ALTER COLUMN "date" TYPE VARCHAR(10) USING "date"::text;
