# Admin Settings APIs - Separated

## Overview
The admin settings have been separated into two distinct APIs for better organization and clarity:

1. **Account Settings** - Profile and contact information
2. **General Settings** - Application preferences (timezone, currency, language)

---

## 1. Account Settings API

### Purpose
Manage admin profile information including email, name, company, and contact details.

### Endpoints

#### GET Account Settings
**Endpoint:** `GET /api/user/admin/account-settings`

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "message": "Admin account settings fetched successfully",
  "data": {
    "email": "admin@example.com",
    "userName": "Admin",
    "companyName": "SHR Homes Ltd",
    "contact": "9876543210"
  }
}
```

#### UPDATE Account Settings
**Endpoint:** `PUT /api/user/admin/account-settings`

**Authentication:** Required (Admin Bearer Token)

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "userName": "Admin User",
  "companyName": "SHR Homes International",
  "contact": "1234567890"
}
```

**Note:** All fields are optional. Only include the fields you want to update.

**Response:**
```json
{
  "success": true,
  "message": "Admin account settings updated successfully",
  "data": {
    "email": "newemail@example.com",
    "userName": "Admin User",
    "companyName": "SHR Homes International",
    "contact": "1234567890"
  }
}
```

---

## 2. General Settings API

### Purpose
Manage application-wide preferences including timezone, currency, and language.

### Endpoints

#### GET General Settings
**Endpoint:** `GET /api/user/admin/general-settings`

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "message": "Admin general settings fetched successfully",
  "data": {
    "timezone": "Central Time (CT)",
    "currency": "GBP (£)",
    "language": "French"
  }
}
```

#### UPDATE General Settings
**Endpoint:** `PUT /api/user/admin/general-settings`

**Authentication:** Required (Admin Bearer Token)

**Request Body:**
```json
{
  "timezone": "Eastern Time (ET)",
  "currency": "USD ($)",
  "language": "English"
}
```

**Note:** All fields are optional. Only include the fields you want to update.

**Response:**
```json
{
  "success": true,
  "message": "Admin general settings updated successfully",
  "data": {
    "timezone": "Eastern Time (ET)",
    "currency": "USD ($)",
    "language": "English"
  }
}
```

---

## Example Usage

### Using JavaScript/Fetch

```javascript
// Login first
const loginRes = await fetch('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin@123'
    })
});
const { token } = await loginRes.json();

// === ACCOUNT SETTINGS ===

// Get account settings
const accountRes = await fetch('http://localhost:3000/api/user/admin/account-settings', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const accountSettings = await accountRes.json();

// Update account settings
const updateAccountRes = await fetch('http://localhost:3000/api/user/admin/account-settings', {
    method: 'PUT',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        companyName: 'SHR Homes Ltd',
        contact: '9876543210'
    })
});

// === GENERAL SETTINGS ===

// Get general settings
const generalRes = await fetch('http://localhost:3000/api/user/admin/general-settings', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const generalSettings = await generalRes.json();

// Update general settings
const updateGeneralRes = await fetch('http://localhost:3000/api/user/admin/general-settings', {
    method: 'PUT',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        timezone: 'Pacific Time (PT)',
        currency: 'EUR (€)',
        language: 'Spanish'
    })
});
```

### Using cURL

#### Account Settings
```bash
# Get account settings
curl -X GET http://localhost:3000/api/user/admin/account-settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update account settings
curl -X PUT http://localhost:3000/api/user/admin/account-settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "SHR Homes Ltd",
    "contact": "9876543210"
  }'
```

#### General Settings
```bash
# Get general settings
curl -X GET http://localhost:3000/api/user/admin/general-settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update general settings
curl -X PUT http://localhost:3000/api/user/admin/general-settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "Eastern Time (ET)",
    "currency": "USD ($)",
    "language": "English"
  }'
```

---

## Supported Values

### Account Settings Fields
- **email**: Valid email address
- **userName**: Any string (max 255 characters)
- **companyName**: Any string (max 255 characters)
- **contact**: Phone number string (max 15 characters)

### General Settings Fields

#### Timezone Examples
- `"UTC"`
- `"Eastern Time (ET)"`
- `"Central Time (CT)"`
- `"Mountain Time (MT)"`
- `"Pacific Time (PT)"`
- Any valid timezone string

#### Currency Examples
- `"USD ($)"`
- `"EUR (€)"`
- `"GBP (£)"`
- `"INR (₹)"`
- Any currency format

#### Language Examples
- `"English"`
- `"Spanish"`
- `"French"`
- `"German"`
- Any language name

---

## Benefits of Separation

### 1. **Clear Separation of Concerns**
- Account settings handle identity and contact information
- General settings handle application preferences
- Each API has a single, well-defined responsibility

### 2. **Better Security**
- Can apply different validation rules to each type of setting
- Easier to audit changes to critical account information
- Can implement different rate limiting if needed

### 3. **Improved Frontend Integration**
- Frontend can have separate UI sections for each type of setting
- Easier to implement partial updates
- Better user experience with focused forms

### 4. **Cleaner API Design**
- Each endpoint returns only relevant data
- Smaller response payloads
- More intuitive for API consumers

---

## Implementation Details

### Files Modified

1. **`src/modules/user/user.controller.ts`**
   - Added `getAdminAccountSettings` and `updateAdminAccountSettings`
   - Added `getAdminGeneralSettings` and `updateAdminGeneralSettings`
   - Updated Swagger documentation for all endpoints

2. **`src/modules/user/user.routes.ts`**
   - Added routes for `/admin/account-settings` (GET, PUT)
   - Added routes for `/admin/general-settings` (GET, PUT)
   - Removed old combined `/admin/settings` routes

3. **`prisma/schema.prisma`**
   - User model includes both account fields and general settings fields

### Database Schema
```prisma
model User {
  // Account Settings
  userId       String   @id @default(uuid())
  userName     String
  email        String
  contact      String
  companyName  String?
  
  // General Settings
  timezone     String?  @default("UTC")
  currency     String?  @default("USD")
  language     String?  @default("English")
  
  // ... other fields
}
```

---

## Testing

Both APIs have been tested and verified:

✅ **Account Settings**
- Get current account settings
- Update company name and contact
- Verify changes persist
- Confirm general settings remain unchanged

✅ **General Settings**
- Get current general settings
- Update timezone, currency, and language
- Verify changes persist
- Confirm account settings remain unchanged

✅ **Isolation**
- Updates to account settings don't affect general settings
- Updates to general settings don't affect account settings
- Each API returns only its relevant data

---

## Error Handling

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Error message describing the issue"
}
```

---

## Swagger Documentation

Both endpoints are fully documented in Swagger UI. Access it at:
```
http://localhost:3000/api-docs
```

Navigate to the **Users** section to see:
- `/api/user/admin/account-settings` (GET, PUT)
- `/api/user/admin/general-settings` (GET, PUT)

---

## Migration Notes

### Old Endpoint (Deprecated)
- `GET /api/user/admin/settings`
- `PUT /api/user/admin/settings`

### New Endpoints
- `GET /api/user/admin/account-settings`
- `PUT /api/user/admin/account-settings`
- `GET /api/user/admin/general-settings`
- `PUT /api/user/admin/general-settings`

**Recommendation:** Update your frontend to use the new separated endpoints for better organization and clarity.
