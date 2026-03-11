/**
 * EXAMPLE API REQUESTS - Updated User Model
 * 
 * This file demonstrates how to use the updated User API endpoints
 * with all the new fields from the Prisma schema.
 */

// ============================================
// 1. CREATE USER (POST /api/user)
// ============================================

const createUserExample = {
    method: 'POST',
    url: 'http://localhost:3000/api/user',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_JWT_TOKEN'
    },
    body: {
        // Required fields
        userName: "John Doe",
        role: "user",                    // "admin" | "user" | "supervisor"
        email: "john.doe@example.com",
        contact: "9876543210",

        // Optional fields (NEW!)
        password: "SecurePassword123!",  // Will be hashed automatically
        estimatedInvestment: 500000.00,
        notes: "VIP client, prefers email communication",
        companyName: "ABC Construction Ltd",
        supervisorId: "d1f8ac24-57c1-47aa-ae6a-092de6e55553",
        timezone: "Asia/Kolkata",
        currency: "INR",
        language: "English"
    }
};

// ============================================
// 2. UPDATE USER (PUT /api/user/{userId})
// ============================================

const updateUserExample = {
    method: 'PUT',
    url: 'http://localhost:3000/api/user/123e4567-e89b-12d3-a456-426614174000',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_JWT_TOKEN'
    },
    body: {
        // Update any fields
        userName: "John Doe Updated",
        companyName: "XYZ Builders Pvt Ltd",
        estimatedInvestment: 750000.00,
        timezone: "America/New_York",
        currency: "USD",
        language: "English",
        notes: "Updated notes"
    }
};

// ============================================
// 3. UPDATE USER PROFILE (PUT /api/user/profile)
// ============================================

const updateProfileExample = {
    method: 'PUT',
    url: 'http://localhost:3000/api/user/profile',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_USER_JWT_TOKEN'
    },
    body: {
        userName: "Jane Smith",
        contact: "1234567890",
        companyName: "Smith Enterprises",
        notes: "Prefer morning calls",
        estimatedInvestment: 300000.00,
        timezone: "Europe/London",
        currency: "GBP",
        language: "English"
    }
};

// ============================================
// 4. GET USER BY ID (GET /api/user/{userId})
// ============================================

const getUserExample = {
    method: 'GET',
    url: 'http://localhost:3000/api/user/123e4567-e89b-12d3-a456-426614174000',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
};

// RESPONSE will include all fields:
const exampleResponse = {
    success: true,
    message: "User fetched successfully",
    data: {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        userName: "John Doe",
        role: "user",
        email: "john.doe@example.com",
        password: "$2b$10$...",  // Hashed password
        contact: "9876543210",
        estimatedInvestment: 500000.00,
        notes: "VIP client, prefers email communication",
        companyName: "ABC Construction Ltd",
        supervisorId: "d1f8ac24-57c1-47aa-ae6a-092de6e55553",
        timezone: "Asia/Kolkata",
        currency: "INR",
        language: "English",
        createdAt: "2026-01-29T08:00:00.000Z",
        updatedAt: "2026-01-29T08:00:00.000Z"
    }
};

// ============================================
// 5. UPDATE ADMIN ACCOUNT SETTINGS
// ============================================

const updateAdminAccountSettings = {
    method: 'PUT',
    url: 'http://localhost:3000/api/user/admin/account-settings',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_JWT_TOKEN'
    },
    body: {
        email: "admin@shrhomes.com",
        userName: "Admin User",
        companyName: "SHR Homes Ltd",
        contact: "1234567890"
    }
};

// ============================================
// 6. UPDATE ADMIN GENERAL SETTINGS
// ============================================

const updateAdminGeneralSettings = {
    method: 'PUT',
    url: 'http://localhost:3000/api/user/admin/general-settings',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_JWT_TOKEN'
    },
    body: {
        timezone: "Asia/Kolkata",
        currency: "INR",
        language: "English"
    }
};

// ============================================
// NOTES
// ============================================

/*
 * All new fields are OPTIONAL except for the original required fields:
 * - userName
 * - role
 * - email
 * - contact
 * 
 * Password field:
 * - Will be automatically hashed when creating or updating users
 * - Never returned in plain text from the API
 * 
 * Settings fields (timezone, currency, language):
 * - Have sensible defaults (UTC, USD, English)
 * - Can be updated separately via the admin general settings endpoint
 * 
 * Financial fields:
 * - estimatedInvestment: Stored as DECIMAL(12,2) in database
 * 
 * To test in Swagger:
 * 1. Visit http://localhost:3000/api-docs
 * 2. Look for the "Users" tag
 * 3. Check the schemas section for complete User model definition
 */

module.exports = {
    createUserExample,
    updateUserExample,
    updateProfileExample,
    getUserExample,
    updateAdminAccountSettings,
    updateAdminGeneralSettings,
    exampleResponse
};
