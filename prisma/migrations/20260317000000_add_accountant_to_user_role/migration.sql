-- Add 'accountant' value to the UserRole enum
ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'accountant';
