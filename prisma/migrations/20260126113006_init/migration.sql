-- CreateEnum
CREATE TYPE "users_role_enum" AS ENUM ('admin', 'user', 'supervisor');

-- CreateEnum
CREATE TYPE "projects_projecttype_enum" AS ENUM ('villa', 'apartment', 'building');

-- CreateEnum
CREATE TYPE "projects_initialstatus_enum" AS ENUM ('Planning', 'Inprogress', 'OnHold');

-- CreateEnum
CREATE TYPE "supervisors_status_enum" AS ENUM ('Active', 'Inactive', 'reject');

-- CreateEnum
CREATE TYPE "daily_updates_constructionstage_enum" AS ENUM ('Foundation', 'Framing', 'Plumbing & Electrical', 'Interior Walls', 'Painting', 'Finishing');

-- CreateEnum
CREATE TYPE "daily_updates_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "documents_documenttype_enum" AS ENUM ('Agreement', 'plans', 'permit', 'others');

-- CreateEnum
CREATE TYPE "expenses_category_enum" AS ENUM ('Labor', 'Equipment', 'Permits', 'Materials');

-- CreateEnum
CREATE TYPE "expenses_status_enum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "payments_paymentstatus_enum" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "payments_paymentmethod_enum" AS ENUM ('cash', 'card', 'bank_transfer', 'cheque', 'online');

-- CreateEnum
CREATE TYPE "quotations_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'locked');

-- CreateTable
CREATE TABLE "users" (
    "userId" UUID NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "role" "users_role_enum" NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255),
    "contact" VARCHAR(15) NOT NULL,
    "estimatedInvestment" DECIMAL(12,2),
    "notes" TEXT,
    "supervisorId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "projects" (
    "projectId" UUID NOT NULL,
    "projectName" VARCHAR(255) NOT NULL,
    "projectType" "projects_projecttype_enum" NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "initialStatus" "projects_initialstatus_enum" NOT NULL,
    "startDate" DATE NOT NULL,
    "expectedCompletion" DATE NOT NULL,
    "totalBudget" DECIMAL(12,2) NOT NULL,
    "materialName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "userId" UUID,
    "supervisorId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "supervisors" (
    "supervisorId" UUID NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(15) NOT NULL,
    "password" VARCHAR(255),
    "status" "supervisors_status_enum" NOT NULL DEFAULT 'Active',
    "approve" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisors_pkey" PRIMARY KEY ("supervisorId")
);

-- CreateTable
CREATE TABLE "daily_updates" (
    "dailyUpdateId" UUID NOT NULL,
    "constructionStage" "daily_updates_constructionstage_enum" NOT NULL DEFAULT 'Foundation',
    "description" TEXT,
    "rawMaterials" JSONB DEFAULT '[]',
    "imageUrl" VARCHAR(500),
    "imageName" VARCHAR(255),
    "imageType" VARCHAR(100),
    "videoUrl" VARCHAR(500),
    "status" "daily_updates_status_enum" NOT NULL DEFAULT 'pending',
    "projectId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_updates_pkey" PRIMARY KEY ("dailyUpdateId")
);

-- CreateTable
CREATE TABLE "auth_login" (
    "authLoginId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,

    CONSTRAINT "auth_login_pkey" PRIMARY KEY ("authLoginId")
);

-- CreateTable
CREATE TABLE "documents" (
    "documentId" UUID NOT NULL,
    "documentType" "documents_documenttype_enum" NOT NULL DEFAULT 'Agreement',
    "fileData" BYTEA NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "projectId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expenseId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "category" "expenses_category_enum" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "status" "expenses_status_enum" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expenseId")
);

-- CreateTable
CREATE TABLE "materials" (
    "materialId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "materialName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("materialId")
);

-- CreateTable
CREATE TABLE "payments" (
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "projectId" UUID,
    "paymentStatus" "payments_paymentstatus_enum" NOT NULL DEFAULT 'pending',
    "paymentMethod" "payments_paymentmethod_enum" NOT NULL DEFAULT 'cash',
    "paymentDate" DATE NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "quotations" (
    "quotationId" UUID NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "quotations_status_enum" NOT NULL DEFAULT 'pending',
    "lineItems" JSONB DEFAULT '[]',
    "date" DATE,
    "projectId" UUID,
    "fileData" BYTEA,
    "fileName" VARCHAR(255),
    "fileType" VARCHAR(100),
    "fileUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("quotationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "supervisors_email_key" ON "supervisors"("email");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "supervisors"("supervisorId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_updates" ADD CONSTRAINT "daily_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;
