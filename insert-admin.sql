-- Manual Admin Creation Script
-- Run this with: npx prisma db execute --file=insert-admin.sql --schema=prisma/schema.prisma

-- First, hash your password using bcrypt with rounds=10
-- Password: Adminshr@123!
-- You can use: https://bcrypt-generator.com/ or run: node -e "console.log(require('bcrypt').hashSync('Adminshr@123!', 10))"

INSERT INTO users (
    "userId",
    "userName",
    role,
    email,
    password,
    contact,
    status,
    "companyName",
    timezone,
    currency,
    language,
    address,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Super Admin',
    'admin',
    'admin@shrhomes.com',
    '$2b$10$B.omQKIn12icC7NWSVeUoufUEpMDm8MiDJN8VVorMjUhlVm92',  -- Hashed: Adminshr@123!
    '9876543210',
    'Active',
    'SHR Homes',
    'UTC',
    'USD ($)',
    'English',
    NULL,
    NOW(),
    NOW()
);
