# Authentication API Documentation

This document provides a comprehensive list of all Authentication APIs available in the Shr-Homes-Backend.

## Table of Contents
1. [Admin Login](#admin-login)
2. [User Login](#user-login)
3. [Supervisor Login](#supervisor-login)
4. [Logout](#logout)

---

### Admin Login
- **Endpoint**: `/api/auth/admin/login`
- **Method**: `POST`
- **Description**: Authenticates an administrator and returns a JWT token along with user details.
- **Payload**:
  ```json
  {
    "email": "admin@example.com",
    "password": "adminpassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_string",
    "email": "admin@example.com",
    "role": "admin"
  }
  ```

---

### User Login
- **Endpoint**: `/api/auth/user/login`
- **Method**: `POST`
- **Description**: Authenticates a regular user (Customer) and returns a JWT token along with user details.
- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "userpassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_string",
    "email": "user@example.com",
    "role": "user",
    "userId": "uuid-string"
  }
  ```

---

### Supervisor Login
- **Endpoint**: `/api/auth/supervisor/login`
- **Method**: `POST`
- **Description**: Authenticates a supervisor and returns a JWT token along with user details.
- **Payload**:
  ```json
  {
    "email": "supervisor@example.com",
    "password": "supervisorpassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "jwt_token_string",
    "email": "supervisor@example.com",
    "role": "supervisor",
    "userId": "uuid-string"
  }
  ```

---

### Logout
- **Endpoint**: `/api/auth/logout`
- **Method**: `POST`
- **Description**: Invalidates the current user's session.
- **Headers**:
  - `Authorization`: `Bearer <your_token>`
- **Payload**: Empty body
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
