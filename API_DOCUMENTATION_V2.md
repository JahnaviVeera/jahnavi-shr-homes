# Shr Homes API Documentation - Organized by Role

Base URL: `/api`

---

## 1. ADMIN APIs

### Authentication

#### Admin Login
- **Endpoint**: `POST /api/auth/admin/login`
- **Authentication**: None (Public)
- **Mandatory Fields**: `email`, `password`
- **JSON Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```
- **Response**: Returns JWT token for admin authentication

---

### User Management

#### Get All Users
- **Endpoint**: `GET /api/user`
- **Authentication**: None (Public)
- **JSON Body**: None
- **Response**: List of all users

#### Create New User
- **Endpoint**: `POST /api/user`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `userName`, `email`, `role`
- **JSON Body**:
```json
{
  "userName": "John Doe",
  "email": "john@example.com",
  "amount": 5000000,
  "role": "user",
  "contact": "1234567890",
  "estimatedInvestment": "50L",
  "notes": "Premium customer"
}
```

#### Get Admin Settings
- **Endpoint**: `GET /api/user/admin/settings`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None

#### Update Admin Settings
- **Endpoint**: `PUT /api/user/admin/settings`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `email`, `companyName`
- **JSON Body**:
```json
{
  "email": "admin@shr.com",
  "companyName": "Shr Homes"
}
```

#### Change Admin Password
- **Endpoint**: `POST /api/user/admin/change-password`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `currentPassword`, `newPassword`, `confirmNewPassword`
- **JSON Body**:
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword",
  "confirmNewPassword": "newPassword"
}
```

#### Get User by ID
- **Endpoint**: `GET /api/user/:userId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `userId` (UUID)

#### Update User
- **Endpoint**: `PUT /api/user/:userId`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "userName": "John Doe",
  "email": "john.new@example.com",
  "contact": "1122334455",
  "estimatedInvestment": "60L",
  "notes": "Updated notes"
}
```
- **URL Parameters**: `userId` (UUID)

#### Delete User
- **Endpoint**: `DELETE /api/user/:userId`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `userId` (UUID)

#### Assign Supervisor to User
- **Endpoint**: `POST /api/user/:userId/assign-supervisor`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `supervisorId`
- **JSON Body**:
```json
{
  "supervisorId": "uuid-of-supervisor"
}
```
- **URL Parameters**: `userId` (UUID)

#### Remove Supervisor from User
- **Endpoint**: `DELETE /api/user/:userId/remove-supervisor`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `userId` (UUID)

#### Get Users Without Supervisor
- **Endpoint**: `GET /api/user/without-supervisor`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None

---

### Supervisor Management

#### Get All Supervisors
- **Endpoint**: `GET /api/supervisor`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Create Supervisor
- **Endpoint**: `POST /api/supervisor`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `fullName`, `email`, `phoneNumber`, `password`, `status`
- **JSON Body**:
```json
{
  "fullName": "Supervisor Name",
  "email": "super@example.com",
  "phoneNumber": "9988776655",
  "password": "password123",
  "status": "active"
}
```

#### Get Supervisor by ID
- **Endpoint**: `GET /api/supervisor/:supervisorId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `supervisorId` (UUID)

#### Update Supervisor
- **Endpoint**: `PUT /api/supervisor/:supervisorId`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "fullName": "New Name",
  "status": "inactive"
}
```
- **URL Parameters**: `supervisorId` (UUID)

#### Delete Supervisor
- **Endpoint**: `DELETE /api/supervisor/:supervisorId`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `supervisorId` (UUID)

#### Assign Project to Supervisor
- **Endpoint**: `POST /api/supervisor/:supervisorId/assign-project`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `projectId`
- **JSON Body**:
```json
{
  "projectId": "uuid-of-project"
}
```
- **URL Parameters**: `supervisorId` (UUID)

#### Remove Project from Supervisor
- **Endpoint**: `DELETE /api/supervisor/:supervisorId/remove-project`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `projectId`
- **JSON Body**:
```json
{
  "projectId": "uuid-of-project"
}
```
- **URL Parameters**: `supervisorId` (UUID)

---

### Project Management

#### Create Project
- **Endpoint**: `POST /api/project/createproject`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `projectName`, `projectType`, `location`, `initialStatus`, `startDate`, `expectedCompletion`, `totalBudget`, `userId`
- **JSON Body**:
```json
{
  "projectName": "Luxury Villa",
  "projectType": "Residential",
  "location": "Hyderbad",
  "initialStatus": "Planning",
  "startDate": "2024-01-01",
  "expectedCompletion": "2025-01-01",
  "totalBudget": 5000000,
  "userId": "uuid-of-user",
  "materialName": "Cement",
  "quantity": 100,
  "notes": "Initial setup"
}
```

#### Update Project
- **Endpoint**: `PUT /api/project/updateproject/:projectId`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "projectName": "Luxury Villa Updated",
  "totalBudget": 6000000
}
```
- **URL Parameters**: `projectId` (UUID)

#### Delete Project
- **Endpoint**: `DELETE /api/project/deleteproject/:projectId`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

#### Get Project by ID
- **Endpoint**: `GET /api/project/getproject/:projectId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

#### Get All Projects
- **Endpoint**: `GET /api/project/getallprojects`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Document Management

#### Get All Documents
- **Endpoint**: `GET /api/documents`
- **Authentication**: None (Public)
- **Query Parameters**: `documentType` (optional), `projectId` (optional)
- **Example**: `GET /api/documents?documentType=ARCHITECTURAL&projectId=uuid`
- **JSON Body**: None

#### Upload Document
- **Endpoint**: `POST /api/documents`
- **Authentication**: Admin (Bearer Token Required)
- **Content-Type**: `multipart/form-data`
- **Mandatory Fields**: `documentType`, `file`
- **Form Data**:
  - `documentType`: "Blueprint"
  - `description`: "Main hall blueprint"
  - `projectId`: "uuid"
  - `file`: (File upload)

#### Update Document
- **Endpoint**: `PUT /api/documents/:documentId`
- **Authentication**: Admin (Bearer Token Required)
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `description`: "Updated description"
  - `file`: (New file upload)
- **URL Parameters**: `documentId` (UUID)

#### Delete Document
- **Endpoint**: `DELETE /api/documents/:documentId`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `documentId` (UUID)

#### Download Document
- **Endpoint**: `GET /api/documents/:documentId/download`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `documentId` (UUID)

---

### Expense Management

#### Create Expense
- **Endpoint**: `POST /api/expense`
- **Authentication**: Admin/Supervisor (Bearer Token Required)
- **Mandatory Fields**: `projectId`, `category`, `amount`, `date`
- **JSON Body**:
```json
{
  "projectId": "uuid",
  "category": "Labor",
  "amount": 5000,
  "date": "2024-02-01",
  "description": "Daily wages"
}
```

#### Get All Expenses
- **Endpoint**: `GET /api/expense`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Expense Summary
- **Endpoint**: `GET /api/expense/summary/all-projects`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Material Management

#### Create Material
- **Endpoint**: `POST /api/material`
- **Authentication**: Admin/Supervisor (Bearer Token Required)
- **Mandatory Fields**: `projectId`, `materialName`, `quantity`, `date`
- **JSON Body**:
```json
{
  "projectId": "uuid",
  "materialName": "Steel",
  "quantity": 500,
  "date": "2024-02-01",
  "notes": "Grade A Steel"
}
```

#### Get All Materials
- **Endpoint**: `GET /api/material`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Materials by Project
- **Endpoint**: `GET /api/material/project/:projectId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

---

### Payment Management

#### Create Payment
- **Endpoint**: `POST /api/payment/createpayment`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: `amount`, `projectId`, `paymentStatus`, `paymentDate`
- **JSON Body**:
```json
{
  "amount": 25000,
  "projectId": "uuid",
  "paymentStatus": "pending",
  "paymentDate": "2024-02-01",
  "paymentType": "Standard",
  "paymentMethod": "cash",
  "remarks": "Advance payment"
}
```

#### Update Payment
- **Endpoint**: `PUT /api/payment/updatepayment/:paymentId`
- **Authentication**: Admin (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "paymentStatus": "completed",
  "amount": 25000
}
```
- **URL Parameters**: `paymentId` (UUID)

#### Delete Payment
- **Endpoint**: `DELETE /api/payment/deletepayment/:paymentId`
- **Authentication**: Admin (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `paymentId` (UUID)

#### Get Budget Summary
- **Endpoint**: `GET /api/payment/budget-summary`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Quotation Management

#### Create Quotation
- **Endpoint**: `POST /api/quotations`
- **Authentication**: Admin (Bearer Token Required)
- **Content-Type**: `multipart/form-data`
- **Mandatory Fields**: `status`, `projectId`, `lineItems`
- **Form Data**:
  - `status`: "pending"
  - `projectId`: "uuid"
  - `lineItems`: `[{"description": "Flooring", "amount": 10000}]` (Stringified JSON)
  - `totalAmount`: 10000
  - `date`: "2024-02-01"
  - `file`: (File upload)

---

### Messaging

#### Send Message
- **Endpoint**: `POST /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **Mandatory Fields**: `message`, `receiverId`
- **JSON Body**:
```json
{
  "subject": "Project Query",
  "message": "When is the deadline?",
  "receiverId": "uuid-of-recipient",
  "projectId": "uuid-of-project"
}
```

#### Get My Messages
- **Endpoint**: `GET /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None

#### Mark Message as Read
- **Endpoint**: `PATCH /api/messages/:messageId/read`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `messageId` (UUID)

---

### Notifications

#### Get Notifications
- **Endpoint**: `GET /api/notifications`
- **Authentication**: User (Bearer Token Required)
- **Query Parameters**: `unreadOnly` (boolean, optional)
- **Example**: `GET /api/notifications?unreadOnly=true`
- **JSON Body**: None

#### Mark All Notifications as Read
- **Endpoint**: `PATCH /api/notifications/mark-all-read`
- **Authentication**: User (Bearer Token Required)
- **JSON Body**: None

---

## 2. SUPERVISOR APIs

### Authentication

#### Supervisor Login
- **Endpoint**: `POST /api/auth/supervisor/login`
- **Authentication**: None (Public)
- **Mandatory Fields**: `email`, `password`
- **JSON Body**:
```json
{
  "email": "supervisor@example.com",
  "password": "password123"
}
```
- **Response**: Returns JWT token for supervisor authentication

---

### Profile Management

#### Get Profile (Self)
- **Endpoint**: `GET /api/supervisor/profile`
- **Authentication**: Supervisor (Bearer Token Required)
- **JSON Body**: None

#### Update Profile (Self)
- **Endpoint**: `PUT /api/supervisor/profile`
- **Authentication**: Supervisor (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "fullName": "Updated Name",
  "email": "updated@example.com",
  "phoneNumber": "1231231234"
}
```

---

### Project Access

#### Get Assigned Projects
- **Endpoint**: `GET /api/supervisor/:supervisorId/assigned-projects`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `supervisorId` (UUID)

---

### Daily Updates Management

#### Get All Daily Updates
- **Endpoint**: `GET /api/daily-updates`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Create Daily Update
- **Endpoint**: `POST /api/daily-updates`
- **Authentication**: Supervisor (Bearer Token Required)
- **Content-Type**: `multipart/form-data`
- **Mandatory Fields**: `constructionStage`, `rawMaterials`
- **Form Data**:
  - `constructionStage`: "Foundation"
  - `description`: "Work done today"
  - `projectId`: "uuid"
  - `rawMaterials`: `[{"materialName": "Cement", "quantity": 10}]` (Stringified JSON)
  - `image`: (File upload)
  - `video`: (File upload)

#### Get Updates by Construction Stage
- **Endpoint**: `GET /api/daily-updates/stage/:constructionStage`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `constructionStage` (string)

#### Delete Daily Update
- **Endpoint**: `DELETE /api/daily-updates/:dailyUpdateId`
- **Authentication**: Supervisor (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `dailyUpdateId` (UUID)

---

### Expense Management

#### Create Expense
- **Endpoint**: `POST /api/expense`
- **Authentication**: Admin/Supervisor (Bearer Token Required)
- **Mandatory Fields**: `projectId`, `category`, `amount`, `date`
- **JSON Body**:
```json
{
  "projectId": "uuid",
  "category": "Labor",
  "amount": 5000,
  "date": "2024-02-01",
  "description": "Daily wages"
}
```

#### Get All Expenses
- **Endpoint**: `GET /api/expense`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Material Management

#### Create Material
- **Endpoint**: `POST /api/material`
- **Authentication**: Admin/Supervisor (Bearer Token Required)
- **Mandatory Fields**: `projectId`, `materialName`, `quantity`, `date`
- **JSON Body**:
```json
{
  "projectId": "uuid",
  "materialName": "Steel",
  "quantity": 500,
  "date": "2024-02-01",
  "notes": "Grade A Steel"
}
```

#### Get All Materials
- **Endpoint**: `GET /api/material`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Materials by Project
- **Endpoint**: `GET /api/material/project/:projectId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

---

### Messaging

#### Send Message
- **Endpoint**: `POST /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **Mandatory Fields**: `message`, `receiverId`
- **JSON Body**:
```json
{
  "subject": "Project Query",
  "message": "When is the deadline?",
  "receiverId": "uuid-of-recipient",
  "projectId": "uuid-of-project"
}
```

#### Get My Messages
- **Endpoint**: `GET /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None

#### Mark Message as Read
- **Endpoint**: `PATCH /api/messages/:messageId/read`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `messageId` (UUID)

---

## 3. CUSTOMER (USER) APIs

### Authentication

#### User/Customer Login
- **Endpoint**: `POST /api/auth/user/login`
- **Authentication**: None (Public)
- **Mandatory Fields**: `email`, `password`
- **JSON Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**: Returns JWT token for user authentication

---

### Profile Management

#### Update User Profile (Self)
- **Endpoint**: `PUT /api/user/profile`
- **Authentication**: User (Bearer Token Required)
- **Mandatory Fields**: None (Partial update)
- **JSON Body**:
```json
{
  "userName": "John Updated",
  "contact": "9876543210"
}
```

#### Change User Password (Self)
- **Endpoint**: `POST /api/user/profile/change-password`
- **Authentication**: User (Bearer Token Required)
- **Mandatory Fields**: `currentPassword`, `newPassword`, `confirmNewPassword`
- **JSON Body**:
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword",
  "confirmNewPassword": "newPassword"
}
```

---

### Supervisor Management

#### Approve Supervisor
- **Endpoint**: `POST /api/user/:userId/approve-supervisor`
- **Authentication**: Customer (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `userId` (UUID - should be the customer's own ID)

#### Reject Supervisor
- **Endpoint**: `POST /api/user/:userId/reject-supervisor`
- **Authentication**: Customer (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `userId` (UUID - should be the customer's own ID)

#### Get Users by Supervisor
- **Endpoint**: `GET /api/user/supervisor/:supervisorId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `supervisorId` (UUID)

---

### Daily Updates Review

#### Get All Daily Updates
- **Endpoint**: `GET /api/daily-updates`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Updates by Construction Stage
- **Endpoint**: `GET /api/daily-updates/stage/:constructionStage`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `constructionStage` (string)

#### Approve Daily Update
- **Endpoint**: `PUT /api/daily-updates/:dailyUpdateId/approve`
- **Authentication**: Customer (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `dailyUpdateId` (UUID)

#### Reject Daily Update
- **Endpoint**: `PUT /api/daily-updates/:dailyUpdateId/reject`
- **Authentication**: Customer (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `dailyUpdateId` (UUID)

---

### Quotation Review

#### Get Pending Quotations
- **Endpoint**: `GET /api/quotations/pending`
- **Authentication**: User (Bearer Token Required)
- **JSON Body**: None

#### Approve Quotation
- **Endpoint**: `POST /api/quotations/:quotationId/approve`
- **Authentication**: User (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `quotationId` (UUID)

#### Reject Quotation
- **Endpoint**: `POST /api/quotations/:quotationId/reject`
- **Authentication**: User (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `quotationId` (UUID)

---

### Project Access

#### Get Project by ID
- **Endpoint**: `GET /api/project/getproject/:projectId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

#### Get All Projects
- **Endpoint**: `GET /api/project/getallprojects`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Document Access

#### Get All Documents
- **Endpoint**: `GET /api/documents`
- **Authentication**: None (Public)
- **Query Parameters**: `documentType` (optional), `projectId` (optional)
- **Example**: `GET /api/documents?documentType=ARCHITECTURAL&projectId=uuid`
- **JSON Body**: None

#### Download Document
- **Endpoint**: `GET /api/documents/:documentId/download`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `documentId` (UUID)

---

### Messaging

#### Send Message
- **Endpoint**: `POST /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **Mandatory Fields**: `message`, `receiverId`
- **JSON Body**:
```json
{
  "subject": "Project Query",
  "message": "When is the deadline?",
  "receiverId": "uuid-of-recipient",
  "projectId": "uuid-of-project"
}
```

#### Get My Messages
- **Endpoint**: `GET /api/messages`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None

#### Mark Message as Read
- **Endpoint**: `PATCH /api/messages/:messageId/read`
- **Authentication**: Any Authenticated User (Bearer Token Required)
- **JSON Body**: None
- **URL Parameters**: `messageId` (UUID)

---

### Notifications

#### Get Notifications
- **Endpoint**: `GET /api/notifications`
- **Authentication**: User (Bearer Token Required)
- **Query Parameters**: `unreadOnly` (boolean, optional)
- **Example**: `GET /api/notifications?unreadOnly=true`
- **JSON Body**: None

#### Mark All Notifications as Read
- **Endpoint**: `PATCH /api/notifications/mark-all-read`
- **Authentication**: User (Bearer Token Required)
- **JSON Body**: None

---

### Payment Information

#### Get Budget Summary
- **Endpoint**: `GET /api/payment/budget-summary`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Expense Information

#### Get All Expenses
- **Endpoint**: `GET /api/expense`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Expense Summary
- **Endpoint**: `GET /api/expense/summary/all-projects`
- **Authentication**: None (Public)
- **JSON Body**: None

---

### Material Information

#### Get All Materials
- **Endpoint**: `GET /api/material`
- **Authentication**: None (Public)
- **JSON Body**: None

#### Get Materials by Project
- **Endpoint**: `GET /api/material/project/:projectId`
- **Authentication**: None (Public)
- **JSON Body**: None
- **URL Parameters**: `projectId` (UUID)

---

## 4. PUBLIC APIs (No Authentication Required)

### User Information
- `GET /api/user` - Get all users
- `GET /api/user/:userId` - Get user by ID
- `GET /api/user/supervisor/:supervisorId` - Get users by supervisor

### Supervisor Information
- `GET /api/supervisor` - Get all supervisors
- `GET /api/supervisor/:supervisorId` - Get supervisor by ID
- `GET /api/supervisor/:supervisorId/assigned-projects` - Get assigned projects

### Project Information
- `GET /api/project/getproject/:projectId` - Get project by ID
- `GET /api/project/getallprojects` - Get all projects

### Daily Updates
- `GET /api/daily-updates` - Get all daily updates
- `GET /api/daily-updates/stage/:constructionStage` - Get updates by stage

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:documentId/download` - Download document

### Expenses
- `GET /api/expense` - Get all expenses
- `GET /api/expense/summary/all-projects` - Get expense summary

### Materials
- `GET /api/material` - Get all materials
- `GET /api/material/project/:projectId` - Get materials by project

### Payments
- `GET /api/payment/budget-summary` - Get budget summary

---

## Authentication Header Format

For all authenticated endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Response Format

All API responses follow a standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## Notes

1. **UUID Format**: All IDs (userId, projectId, supervisorId, etc.) are in UUID format
2. **Date Format**: All dates should be in `YYYY-MM-DD` format
3. **File Uploads**: Use `multipart/form-data` content type for file uploads
4. **Query Parameters**: Optional filters can be added to GET requests
5. **Partial Updates**: PUT endpoints support partial updates (only send fields to update)
