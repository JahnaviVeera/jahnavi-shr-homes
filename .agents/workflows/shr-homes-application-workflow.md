# SHR Homes — Complete Application Workflow Documentation

> **Last Updated:** 11 March 2026, 11:13 AM IST  
> **Backend Stack:** Node.js · TypeScript · Express.js · Prisma ORM · PostgreSQL (Supabase) · Socket.io  
> **Base URL:** `http://localhost:3000/api`  
> **Swagger Docs:** `http://localhost:3000/api-docs`

---

## 📑 Table of Contents

1. [System Overview](#1-system-overview)
2. [Roles & Permissions Matrix](#2-roles--permissions-matrix)
3. [Authentication Workflow](#3-authentication-workflow)
4. [Lead Management Workflow](#4-lead-management-workflow)
5. [Customer Management Workflow](#5-customer-management-workflow)
6. [Supervisor Management Workflow](#6-supervisor-management-workflow)
7. [Project Management Workflow](#7-project-management-workflow)
8. [Daily Updates Workflow](#8-daily-updates-workflow)
9. [Quotations Workflow](#9-quotations-workflow)
10. [Payments Workflow](#10-payments-workflow)
11. [Expenses Workflow](#11-expenses-workflow)
12. [Materials Management Workflow](#12-materials-management-workflow)
13. [Purchases Workflow](#13-purchases-workflow)
14. [Documents Workflow](#14-documents-workflow)
15. [Notifications Workflow](#15-notifications-workflow)
16. [Messages Workflow](#16-messages-workflow)
17. [Analytics Workflow](#17-analytics-workflow)
18. [Real-time Events (WebSocket)](#18-real-time-events-websocket)
19. [File Upload Architecture](#19-file-upload-architecture)
20. [Complete API Route Summary](#20-complete-api-route-summary)

---

## 1. System Overview

SHR Homes is a construction project management platform that connects three user roles:

```
Admin ──────────► Creates & manages everything
  │
  ├──► Customers (Leads → Customers)
  │       └──► View project progress, approve/reject updates & quotations
  │
  └──► Supervisors
          └──► Post daily updates, manage materials, request approvals
```

### Key Business Flows

```
Lead (pending) ──[Convert]──► Customer (inprogress) ──[Project Complete]──► Customer (completed)
Project ──► Daily Updates ──► Approval Request ──► Customer Approve/Reject
Project ──► Quotation ──► Customer Approve/Reject
Project ──► Payments (recorded by Admin)
Project ──► Expenses (recorded by Admin) + Receipt Upload
```

---

## 2. Roles & Permissions Matrix

| Feature | Admin | Supervisor | Customer |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| Create Users/Leads | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ❌ | ❌ |
| View All Users | ✅ | ✅ | ✅ |
| Create Project | ✅ | ❌ | ❌ |
| View Projects | ✅ | ✅ | ✅ |
| Create Daily Update | ❌ | ✅ | ❌ |
| Approve Daily Update | ❌ | ❌ | ✅ |
| Create Quotation | ✅ | ❌ | ❌ |
| Approve/Reject Quotation | ❌ | ❌ | ✅ |
| Create Payment | ✅ | ❌ | ❌ |
| View Payments | ✅ | ✅ | ✅ |
| Create Expense | ✅ | ❌ | ❌ |
| View Expenses | ✅ | ✅ | ❌ |
| Upload Materials | ✅ | ✅ | ❌ |
| View Materials | ✅ | ✅ | ✅ |
| Create Purchases | ✅ | ✅ | ❌ |
| Upload Documents | ✅ | ❌ | ❌ |
| View Documents | ✅ | ✅ | ✅ |
| View Notifications | ✅ | ✅ | ✅ |
| Send Messages | ❌ | ✅ | ✅ |
| View Analytics | ✅ | ❌ | ❌ |

---

## 3. Authentication Workflow

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/admin/login` | Admin | Admin login with email/password |
| POST | `/auth/admin/signup` | Public | Admin account creation |
| POST | `/auth/user/login` | Customer | Customer login |
| POST | `/auth/supervisor/login` | Supervisor | Supervisor login |
| POST | `/auth/refresh` | All | Refresh JWT token |
| POST | `/auth/logout` | All (Auth) | Logout & invalidate token |

### Login Flow

```
1. Client sends POST /auth/{role}/login with { email, password }
2. Server validates credentials against database
3. Server issues JWT access token (24h expiry)
4. Client stores token in localStorage as 'authToken'
5. All subsequent requests must include:
   Authorization: Bearer <token>
6. Token refresh via POST /auth/refresh before expiry
7. Logout via POST /auth/logout
```

### Token Usage

```javascript
// All API calls must include:
headers: {
  "Authorization": `Bearer ${localStorage.getItem('authToken')}`
}
```

### Error Responses

| Status | Meaning |
|---|---|
| 400 | Missing or invalid fields |
| 401 | Wrong email or password |
| 403 | Role does not have access to this endpoint |

---

## 4. Lead Management Workflow

Leads are potential customers with `status: "pending"` who have not yet been assigned to a project.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/user/leads/new` | Admin | Get all new/pending leads |
| GET | `/user/leads/closed` | Admin | Get converted customers (inprogress + completed) |
| GET | `/user/leads/stats` | Admin | Lead statistics summary |
| POST | `/user` | Admin | Create a new lead |
| PUT | `/user/:userId` | Admin | Update user/lead details |
| DELETE | `/user/:userId` | Admin | Delete a lead |
| GET | `/user/:userId` | Admin/Supervisor/Customer | Get user by ID |

### Lead Lifecycle

```
Admin creates lead ──► status: "pending"  ──► appears in /leads/new
         │
         └──[Convert to Customer]──► PUT /user/:id { status: "inprogress" }
                                        │
                                        └──► disappears from /leads/new
                                        └──► appears in /leads/closed
```

### Status Values

| Status | Tab Shown | Meaning |
|---|---|---|
| `pending` | Leads Tab | New lead, no project yet |
| `inprogress` | Customers Tab | Converted, project underway |
| `completed` | Customers Tab | Project fully completed |

### Convert to Customer Flow (Frontend → Backend)

```
1. Admin clicks "Convert to Customer" on a lead row
2. Confirmation dialog appears
3. On confirm → PUT /api/user/:userId with body: { "status": "inprogress" }
4. Frontend invalidates /leads/new query → lead disappears
5. Frontend invalidates /leads/closed query → user appears in Customers Tab
```

---

## 5. Customer Management Workflow

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/user` | Admin | Get all users |
| GET | `/user/getallusers` | All (Auth) | Get all users |
| GET | `/user/profile` | All (Auth) | Get logged-in user profile |
| PUT | `/user/profile` | All (Auth) | Update profile |
| POST | `/user/profile/change-password` | All (Auth) | Change password |
| GET | `/user/dashboard-stats` | Customer | Customer dashboard statistics |
| GET | `/user/admin/dashboard-stats` | Admin | Admin dashboard statistics |
| GET | `/user/admin/account-settings` | Admin | Get admin account settings |
| PUT | `/user/admin/account-settings` | Admin | Update admin account settings |
| GET | `/user/admin/general-settings` | Admin | Get timezone, currency, language |
| PUT | `/user/admin/general-settings` | Admin | Update general settings |
| POST | `/user/admin/change-password` | Admin | Change admin password |
| POST | `/user/:userId/approve-supervisor` | Customer | Approve a supervisor's request |
| POST | `/user/:userId/reject-supervisor` | Customer | Reject a supervisor's request |

### Customer Dashboard Stats Response

```json
{
  "projectProgress": 45,
  "pendingApprovals": 3,
  "paidAmount": 350000,
  "pendingAmount": 650000
}
```

---

## 6. Supervisor Management Workflow

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/supervisor` | All (Auth) | List all supervisors |
| POST | `/supervisor` | Admin | Create a new supervisor |
| GET | `/supervisor/profile` | Supervisor | Get my profile |
| PUT | `/supervisor/profile` | Supervisor | Update my profile |
| GET | `/supervisor/my-projects` | Supervisor | Get assigned projects |
| POST | `/supervisor/:supervisorId/assign-project` | Admin | Assign project to supervisor |
| DELETE | `/supervisor/:supervisorId/remove-project` | Admin | Remove project from supervisor |
| GET | `/supervisor/:supervisorId/assigned-projects` | Supervisor | Get project list |
| GET | `/supervisor/:supervisorId/assigned-projects-count` | Admin/Supervisor | Project count |
| GET | `/supervisor/:supervisorId` | All (Auth) | Get supervisor by ID |
| PUT | `/supervisor/:supervisorId` | Admin | Update supervisor |
| DELETE | `/supervisor/:supervisorId` | Admin | Delete supervisor |
| POST | `/supervisor/:supervisorId/change-password` | Admin/Supervisor | Change password |

### Supervisor Creation Flow

```
1. Admin creates supervisor via POST /supervisor
2. Supervisor account is created (user record + supervisor record)
3. Admin assigns project: POST /supervisor/:id/assign-project
4. Supervisor logs in via POST /auth/supervisor/login
5. Supervisor can now post daily updates for assigned projects
```

---

## 7. Project Management Workflow

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/project/createproject` | Admin | Create a new project |
| GET | `/project/getallprojects` | All (Auth) | List all projects |
| GET | `/project/getproject/:projectId` | All (Auth) | Get project details |
| PUT | `/project/updateproject/:projectId` | Admin | Update project |
| DELETE | `/project/deleteproject/:projectId` | Admin | Delete project |
| GET | `/project/recent-active` | Admin | Get recently active projects |
| GET | `/project/project-summary` | Customer | Get customer's project summary |

### Project Fields

```json
{
  "projectId": "uuid",
  "projectName": "Prestige Villa",
  "location": "Hyderabad",
  "totalProgress": 45,
  "totalBudget": 6000000,
  "totalExpense": 240000,
  "customerId": "uuid",
  "supervisorId": "uuid",
  "startDate": "2026-01-01",
  "expectedCompletion": "2026-12-31"
}
```

---

## 8. Daily Updates Workflow

Supervisors post daily construction updates. Customers approve or reject them.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/daily-updates` | Supervisor | Post a daily update (supports image + video uploads) |
| GET | `/daily-updates` | All (Auth) | Get all updates |
| GET | `/daily-updates/pending` | All (Auth) | Get pending updates |
| GET | `/daily-updates/approved` | All (Auth) | Get approved updates |
| GET | `/daily-updates/rejected` | All (Auth) | Get rejected updates |
| GET | `/daily-updates/user/updates` | Customer | Get updates for my project |
| GET | `/daily-updates/user/status/:status` | Customer | Get my updates by status |
| GET | `/daily-updates/supervisor/assigned-projects` | Supervisor | Updates for assigned projects |
| GET | `/daily-updates/supervisor/stats` | Admin/Supervisor | Stats summary |
| GET | `/daily-updates/project/:projectId/timeline` | All (Auth) | Construction timeline |
| PUT | `/daily-updates/:dailyUpdateId/request-approval` | Supervisor | Request customer approval |
| PUT | `/daily-updates/:dailyUpdateId/approve` | Customer | Approve an update |
| PUT | `/daily-updates/:dailyUpdateId/reject` | Customer | Reject an update |
| POST | `/daily-updates/:dailyUpdateId/feedback` | Customer | Add feedback |
| POST | `/daily-updates/stage/mark-complete` | Supervisor | Mark construction stage complete |
| POST | `/daily-updates/stage/approve` | Customer | Approve a stage completion |
| GET | `/daily-updates/:dailyUpdateId/image` | All (Auth) | Download update image |
| GET | `/daily-updates/:dailyUpdateId/video` | All (Auth) | Download update video |
| GET | `/daily-updates/admin/all` | Admin/Supervisor | All admin-level updates |
| POST | `/daily-updates/admin` | Supervisor | Post admin daily update (with image) |
| PUT | `/daily-updates/:dailyUpdateId` | Supervisor | Edit daily update |
| DELETE | `/daily-updates/:dailyUpdateId` | Supervisor | Delete daily update |

### Daily Update Approval Flow

```
1. Supervisor creates daily update (status: "pending")
2. [Optional] Supervisor requests approval → status: "Approval_Requested"
3. Customer receives real-time notification via WebSocket
4. Customer approves → status: "approved"
   OR
   Customer rejects → status: "rejected" (with rejection remarks)
5. Supervisor notified via email + WebSocket
```

### File Uploads for Daily Updates

- Images: `multipart/form-data`, field name `image`
- Videos: `multipart/form-data`, field name `video`
- Stored in Supabase Storage

---

## 9. Quotations Workflow

Admin creates and sends quotations to customers, who can approve or reject.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/quotation` | Admin | Create quotation (with file upload) |
| GET | `/quotation` | Admin/Customer | Get all quotations |
| GET | `/quotation/pending` | Admin/Customer | Get pending quotations |
| GET | `/quotation/status/:status` | Admin/Customer | Filter by status |
| GET | `/quotation/project/:projectId` | All (Auth) | Quotations by project |
| GET | `/quotation/user/:userId` | Admin/Customer | Quotations by user |
| GET | `/quotation/:quotationId` | All (Auth) | Get quotation by ID |
| GET | `/quotation/:quotationId/total-amount` | All (Auth) | Get total amount |
| GET | `/quotation/:quotationId/download` | All (Auth) | Download quotation file |
| POST | `/quotation/:quotationId/approve` | Customer | Approve quotation |
| POST | `/quotation/:quotationId/reject` | Customer | Reject quotation |
| POST | `/quotation/:quotationId/resend` | Admin | Resend to customer |
| PUT | `/quotation/:quotationId` | Admin | Update quotation |
| DELETE | `/quotation/:quotationId` | Admin | Delete quotation |

### Quotation Flow

```
1. Admin creates quotation with PDF/file attachment
2. Customer receives notification
3. Customer reviews quotation via GET /quotation/:id
4. Customer approves → POST /quotation/:id/approve
   OR
   Customer rejects → POST /quotation/:id/reject
5. Admin notified via email + WebSocket event
```

---

## 10. Payments Workflow

Admin records all payments. Payments support Standard (single method) and MultiMode (split methods).

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/payment/createpayment` | Admin | Create payment (with file upload support) |
| GET | `/payment/getallpayments` | All (Auth) | Get all payments |
| GET | `/payment/getpayment/:paymentId` | All (Auth) | Get payment by ID |
| PUT | `/payment/updatepayment/:paymentId` | Admin | Update payment |
| DELETE | `/payment/deletepayment/:paymentId` | Admin | Delete payment |
| GET | `/payment/budget-summary` | All (Auth) | Overall budget summary |
| GET | `/payment/budget-summary/:projectId` | All (Auth) | Budget summary by project |
| GET | `/payment/next-receipt-number/:projectId` | Admin | Get next receipt number |

### Payment Payload (Standard Mode)

```json
{
  "projectId": "uuid",
  "amount": 500000,
  "paymentDate": "2026-03-10",
  "paymentMethod": "bank_transfer",
  "paymentStatus": "completed",
  "paymentType": "Standard",
  "referenceNumber": "123456789012",
  "receivedBy": "Jahnavi",
  "remarks": "1st instalment"
}
```

### Payment Payload (MultiMode)

```json
{
  "projectId": "uuid",
  "amount": 500000,
  "paymentDate": "2026-03-10",
  "paymentType": "MultiMode",
  "paymentBreakup": "[{\"amount\":300000,\"method\":\"bank_transfer\",\"referenceNumber\":\"123456789012\"},{\"amount\":200000,\"method\":\"cheque\",\"referenceNumber\":\"654321\"}]",
  "referenceNumber": null,
  "receivedBy": "Jahnavi"
}
```

### Reference Number Validation Rules

| Payment Method | Required | Format |
|---|---|---|
| `upi` | ✅ Yes | Exactly 12 digits |
| `bank_transfer` | ✅ Yes | Exactly 12 digits |
| `cheque` | ✅ Yes | Exactly 6 digits |
| `cash` | ❌ No | Skipped |
| `MultiMode` | Per breakup entry | Validated per-method |

### Payment Response Fields

```json
{
  "paymentId": "uuid",
  "amount": "500000",
  "paymentMethod": "bank_transfer",
  "paymentType": "Standard",
  "paymentStatus": "completed",
  "receiptNumber": "SHRSU001",
  "referenceNumber": "123456789012",
  "receivedBy": "Jahnavi",
  "recievedBy": "Jahnavi",
  "paymentBreakup": null,
  "paymentDate": "10-03-2026",
  "remarks": null,
  "fileUrl": null,
  "project": { "projectName": "...", "projectId": "..." }
}
```

> **Note:** The response also includes `recievedBy`, `receivedby`, `recievedby` aliases to accommodate frontend spelling variations.

### Receipt Number Format

Auto-generated on creation: `SHR` + first 2 letters of customer name + sequence number  
Example: `SHRJA001`, `SHRSU002`

---

## 11. Expenses Workflow

Admin records project expenses. Supports file (receipt/bill) uploads and category-based payment tracking.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/expense` | Admin | Create expense — `multipart/form-data` with `receipt` file |
| GET | `/expense` | All | Get all expenses |
| GET | `/expense/:expenseId` | Admin/Supervisor | Get expense by ID (includes receipt URL) |
| GET | `/expense/:expenseId/receipt` | Auth | CORS-safe proxy stream of the receipt file |
| PUT | `/expense/:expenseId` | Admin | Update expense |
| DELETE | `/expense/:expenseId` | Admin | Delete expense |
| GET | `/expense/total-count` | Admin/Supervisor | Total expense count |
| GET | `/expense/summary/all-projects` | Admin | Summary across all projects |
| GET | `/expense/summary/:projectId` | Admin/Supervisor | Summary for one project |
| GET | `/expense/project/:projectId` | Admin/Supervisor | All expenses for a project |
| GET | `/expense/project/:projectId/total-count` | Admin/Supervisor | Count per project |
| GET | `/expense/project/:projectId/total-amount` | Admin/Supervisor | Amount per project |
| GET | `/expense/category/list` | Auth | Category-wise expense list |
| GET | `/expense/category/:category` | Admin/Supervisor | Expenses by category |

### Creating an Expense (`multipart/form-data`)

```
Field name     Type           Notes
───────────────────────────────────────────────────────
projectId      String         UUID of the project
amount         String         Parsed to Number by backend
date           String         YYYY-MM-DD format
description    String         Optional notes
category       String (JSON)  Stringified JSON array (see below)
receipt        File           Image or PDF — uploaded to Supabase Storage
```

### Category Array Format

```json
[
  {
    "categoryName": "Labour",
    "paymentMode": "cheque",
    "referenceNumber": "123456"
  },
  {
    "categoryName": "Materials",
    "paymentMode": "upi",
    "referenceNumber": "123456789012"
  },
  {
    "categoryName": "Miscellaneous",
    "paymentMode": "cash"
  }
]
```

### Reference Number Validation (Expenses)

| paymentMode | referenceNumber Required | Format |
|---|---|---|
| `cheque` | ✅ Yes | Exactly 6 digits |
| `upi` | ✅ Yes | Exactly 12 digits |
| `bank_transfer` | ✅ Yes | Exactly 12 digits |
| `cash` | ❌ No | Not validated |
| `other` | ❌ No | Not validated |

### Receipt URL in GET Response

```json
{
  "expenseId": "uuid",
  "receiptUrl": "https://shr.jiobase.com/storage/v1/object/public/documents/expenses/file.pdf",
  "category": [...],
  "amount": 12000,
  "date": "2026-03-09"
}
```

> `receiptUrl` is a **permanent public Supabase URL** — no expiry, safe for canvas/PDF embedding.  
> For cross-origin canvas embedding, use the proxy endpoint: `GET /expense/:expenseId/receipt`

---

## 12. Materials Management Workflow

Tracks material usage on projects.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/material` | All (Auth) | Get all materials |
| GET | `/material/getallmaterials` | All (Auth) | Get all materials (alias) |
| GET | `/material/project/:projectId` | All (Auth) | Materials by project |
| GET | `/material/project/:projectId/total-count` | Admin/Supervisor | Count by project |
| GET | `/material/supervisor/materials` | Supervisor | Materials for my projects |
| POST | `/material` | Admin/Supervisor | Create material entry |
| GET | `/material/:materialId` | All (Auth) | Get by ID |
| PUT | `/material/:materialId` | Admin/Supervisor | Update material |
| DELETE | `/material/:materialId` | Admin/Supervisor | Delete material |

---

## 13. Purchases Workflow

Tracks purchase orders (materials bought for projects).

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/purchases` | Auth | Create a purchase entry |
| GET | `/purchases` | Auth | Get all purchases |

### Purchase Payload

```json
{
  "projectId": "uuid",
  "materialName": "Cement Bags",
  "price": 5000
}
```

### Purchase Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "projectId": "uuid",
      "materialName": "Cement Bags",
      "price": 5000,
      "createdAt": "2026-03-09T00:00:00.000Z"
    }
  ]
}
```

---

## 14. Documents Workflow

Admin uploads project legal documents (agreements, plans, permits, etc.).

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/documents` | Admin | Upload document with file |
| GET | `/documents` | Admin/Customer | Get all documents |
| GET | `/documents/counts/by-type` | All (Auth) | Document counts by type |
| GET | `/documents/project/:projectId` | Admin/Customer | Documents for a project |
| GET | `/documents/:documentId` | All (Auth) | Get document by ID |
| GET | `/documents/:documentId/download` | All (Auth) | Download document file |
| PUT | `/documents/:documentId` | Admin | Update document |
| DELETE | `/documents/:documentId` | Admin | Delete document |

### Document Types

- `Agreement`
- `Plan`
- `Permit`
- `Other`

---

## 15. Notifications Workflow

Real-time in-app notifications for all roles.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/notifications` | All (Auth) | Get all notifications (optional `?unreadOnly=true`) |
| GET | `/notifications/unread-count` | All (Auth) | Count of unread notifications |
| PATCH | `/notifications/mark-all-read` | All (Auth) | Mark all as read |
| PATCH | `/notifications/:notificationId/read` | All (Auth) | Mark single as read |

### Notification Triggers

| Event | Who Gets Notified |
|---|---|
| Payment created | Admins + Customer of that project |
| Payment updated | Customer of that project |
| Daily update posted | Admins |
| Daily update approved | Supervisor who posted it |
| Daily update rejected | Supervisor who posted it |
| Quotation approved | Admin |
| Quotation rejected | Admin |
| Supervisor assigned to project | Customer |

---

## 16. Messages Workflow

Direct messaging between Customers and Supervisors on projects.

### Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/messages` | Customer/Supervisor | Send a message |
| POST | `/messages/:messageId/reply` | Customer/Supervisor | Reply to a message |
| GET | `/messages` | Customer/Supervisor | Get all my messages |
| GET | `/messages/unread/count` | Customer/Supervisor | Unread count |
| GET | `/messages/project/:projectId` | Customer/Supervisor | Messages by project |
| PATCH | `/messages/:messageId/read` | Customer/Supervisor | Mark as read |

---

## 17. Analytics Workflow

High-level platform analytics for Admins.

### Endpoints (mounted under `/api/analytics`)

- New leads list
- Closed customers list
- Payment & expense summaries
- Project progress overview

---

## 18. Real-time Events (WebSocket)

The backend uses **Socket.io** for real-time notifications. Events are emitted per user or per role.

### Event Names

| Event | Emitted When | Emitted To |
|---|---|---|
| `payment_created` | New payment recorded | All Admins |
| `payment_updated` | Payment updated | Customer of the project |
| `notification` | Any notification trigger | Target user by userId |
| `PAYMENT_RECEIVED` | Payment recorded | Customer of the project |
| `PAYMENT_UPDATED` | Payment updated | Customer of the project |

### Connection

```javascript
const socket = io("http://localhost:3000");
socket.on("notification", (data) => {
  // { type, message, paymentId | dailyUpdateId | quotationId }
});
```

---

## 19. File Upload Architecture

All file uploads are handled via **Multer** middleware and stored in **Supabase Storage**.

### Bucket Structure

```
Supabase Storage
├── documents/
│   ├── expenses/       ← Receipt/bill images for expenses
│   └── quotations/     ← Quotation PDF files
├── payments/
│   └── receipts/       ← Payment receipt files
├── daily-updates/
│   ├── images/         ← Daily update photos
│   └── videos/         ← Daily update videos
└── project-docs/       ← Agreement, Plan, Permit files
```

### URL Type

All stored URLs are **permanent public Supabase URLs** in the format:
```
https://shr.jiobase.com/storage/v1/object/public/<bucket>/<path>/<filename>
```

> **No expiry. No authentication required to access.** Safe for direct embedding in frontend PDF generation and canvas.

### CORS-Safe Receipt Proxy

For cross-origin canvas image embedding (e.g., PDF generation):

```
GET /api/expense/:expenseId/receipt
```

Returns the file bytes directly with these headers:
```
Access-Control-Allow-Origin: *
Cross-Origin-Resource-Policy: cross-origin
Content-Type: image/jpeg | application/pdf
Cache-Control: public, max-age=86400
```

---

## 20. Complete API Route Summary

### Base URL: `http://localhost:3000/api`

```
AUTH
  POST   /auth/admin/login
  POST   /auth/admin/signup
  POST   /auth/user/login
  POST   /auth/supervisor/login
  POST   /auth/refresh
  POST   /auth/logout

USERS
  GET    /user
  GET    /user/getallusers
  GET    /user/leads/stats
  GET    /user/leads/new
  GET    /user/leads/closed
  GET    /user/admin/dashboard-stats
  GET    /user/admin/account-settings
  PUT    /user/admin/account-settings
  GET    /user/admin/general-settings
  PUT    /user/admin/general-settings
  POST   /user/admin/change-password
  GET    /user/profile
  PUT    /user/profile
  GET    /user/dashboard-stats
  POST   /user/profile/change-password
  POST   /user
  GET    /user/:userId
  PUT    /user/:userId
  DELETE /user/:userId
  POST   /user/:userId/approve-supervisor
  POST   /user/:userId/reject-supervisor
  POST   /user/:userId/change-password

SUPERVISORS
  GET    /supervisor
  POST   /supervisor
  GET    /supervisor/profile
  PUT    /supervisor/profile
  GET    /supervisor/my-projects
  GET    /supervisor/:supervisorId/assigned-projects
  GET    /supervisor/:supervisorId/assigned-projects-count
  POST   /supervisor/:supervisorId/assign-project
  DELETE /supervisor/:supervisorId/remove-project
  GET    /supervisor/:supervisorId
  PUT    /supervisor/:supervisorId
  DELETE /supervisor/:supervisorId
  POST   /supervisor/:supervisorId/change-password

PROJECTS
  POST   /project/createproject
  GET    /project/getallprojects
  GET    /project/recent-active
  GET    /project/project-summary
  GET    /project/getproject/:projectId
  PUT    /project/updateproject/:projectId
  DELETE /project/deleteproject/:projectId

DAILY UPDATES
  POST   /daily-updates
  GET    /daily-updates
  GET    /daily-updates/pending
  GET    /daily-updates/approved
  GET    /daily-updates/rejected
  GET    /daily-updates/user/updates
  GET    /daily-updates/user/status/:status
  GET    /daily-updates/supervisor/assigned-projects
  GET    /daily-updates/supervisor/stats
  GET    /daily-updates/admin/all
  POST   /daily-updates/admin
  GET    /daily-updates/project/:projectId/timeline
  GET    /daily-updates/stage/mark-complete
  POST   /daily-updates/stage/approve
  GET    /daily-updates/:dailyUpdateId
  GET    /daily-updates/:dailyUpdateId/image
  GET    /daily-updates/:dailyUpdateId/video
  PUT    /daily-updates/:dailyUpdateId/request-approval
  PUT    /daily-updates/:dailyUpdateId/approve
  PUT    /daily-updates/:dailyUpdateId/reject
  POST   /daily-updates/:dailyUpdateId/feedback
  PUT    /daily-updates/:dailyUpdateId
  DELETE /daily-updates/:dailyUpdateId

QUOTATIONS
  POST   /quotation
  GET    /quotation
  GET    /quotation/pending
  GET    /quotation/status/:status
  GET    /quotation/project/:projectId
  GET    /quotation/user/:userId
  GET    /quotation/:quotationId
  GET    /quotation/:quotationId/total-amount
  GET    /quotation/:quotationId/download
  POST   /quotation/:quotationId/approve
  POST   /quotation/:quotationId/reject
  POST   /quotation/:quotationId/resend
  PUT    /quotation/:quotationId
  DELETE /quotation/:quotationId

PAYMENTS
  POST   /payment/createpayment
  GET    /payment/getallpayments
  GET    /payment/getpayment/:paymentId
  PUT    /payment/updatepayment/:paymentId
  DELETE /payment/deletepayment/:paymentId
  GET    /payment/budget-summary
  GET    /payment/budget-summary/:projectId
  GET    /payment/next-receipt-number/:projectId

EXPENSES
  POST   /expense
  GET    /expense
  GET    /expense/total-count
  GET    /expense/summary/all-projects
  GET    /expense/summary/:projectId
  GET    /expense/project/:projectId
  GET    /expense/project/:projectId/total-count
  GET    /expense/project/:projectId/total-amount
  GET    /expense/category/list
  GET    /expense/category/:category
  GET    /expense/:expenseId
  GET    /expense/:expenseId/receipt
  PUT    /expense/:expenseId
  DELETE /expense/:expenseId

MATERIALS
  POST   /material
  GET    /material
  GET    /material/getallmaterials
  GET    /material/supervisor/materials
  GET    /material/project/:projectId
  GET    /material/project/:projectId/total-count
  GET    /material/:materialId
  PUT    /material/:materialId
  DELETE /material/:materialId

PURCHASES
  POST   /purchases
  GET    /purchases

DOCUMENTS
  POST   /documents
  GET    /documents
  GET    /documents/counts/by-type
  GET    /documents/project/:projectId
  GET    /documents/:documentId
  GET    /documents/:documentId/download
  PUT    /documents/:documentId
  DELETE /documents/:documentId

NOTIFICATIONS
  GET    /notifications
  GET    /notifications/unread-count
  PATCH  /notifications/mark-all-read
  PATCH  /notifications/:notificationId/read

MESSAGES
  POST   /messages
  GET    /messages
  GET    /messages/unread/count
  GET    /messages/project/:projectId
  POST   /messages/:messageId/reply
  PATCH  /messages/:messageId/read
```

---

> Document generated on **11 March 2026 at 11:13 AM IST**.  
> For Swagger / interactive documentation, visit: `http://localhost:3000/api-docs`
