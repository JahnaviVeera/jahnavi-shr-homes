-- Create Admin User Manually
-- Password: Adminshr@123! (hashed with bcrypt)

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
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Super Admin',
    'admin',
    'admin@shrhomes.com',
    '$2b$10$YourHashedPasswordHere',  -- You'll need to hash this
    '9876543210',
    'Active',
    'SHR Homes',
    'UTC',
    'USD',
    'English',
    NOW(),
    NOW()
);
