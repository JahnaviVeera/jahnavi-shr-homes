# Admin Settings - Quick Reference

## Two Separate APIs

### 1. Account Settings (Profile Info)
**Base Path:** `/api/user/admin/account-settings`

| Method | Endpoint | Purpose | Fields |
|--------|----------|---------|--------|
| GET | `/api/user/admin/account-settings` | Get profile info | email, userName, companyName, contact |
| PUT | `/api/user/admin/account-settings` | Update profile | email, userName, companyName, contact |

**Example:**
```bash
# Update company and contact
curl -X PUT http://localhost:3000/api/user/admin/account-settings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName": "SHR Homes", "contact": "1234567890"}'
```

---

### 2. General Settings (Preferences)
**Base Path:** `/api/user/admin/general-settings`

| Method | Endpoint | Purpose | Fields |
|--------|----------|---------|--------|
| GET | `/api/user/admin/general-settings` | Get preferences | timezone, currency, language |
| PUT | `/api/user/admin/general-settings` | Update preferences | timezone, currency, language |

**Example:**
```bash
# Update timezone and currency
curl -X PUT http://localhost:3000/api/user/admin/general-settings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Pacific Time (PT)", "currency": "USD ($)"}'
```

---

## Default Values

| Field | Default Value |
|-------|---------------|
| timezone | `"UTC"` |
| currency | `"USD"` |
| language | `"English"` |

---

## Full Documentation
See `ADMIN_SETTINGS_API.md` for complete documentation with examples and implementation details.
