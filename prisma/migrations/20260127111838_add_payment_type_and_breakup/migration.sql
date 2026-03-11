-- CreateEnum
CREATE TYPE "payments_type_enum" AS ENUM ('Standard', 'MultiMode');

-- AlterEnum
ALTER TYPE "payments_paymentmethod_enum" ADD VALUE 'UPI';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_breakup" JSONB DEFAULT '[]',
ADD COLUMN     "payment_type" "payments_type_enum" NOT NULL DEFAULT 'Standard';
