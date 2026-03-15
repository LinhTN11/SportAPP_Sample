# API Testing Guide

## Postman Collection (JSON)

Copy và paste vào Postman để test các API:

```json
{
  "info": {
    "name": "SportApp Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\",\n  \"fullName\": \"John Doe\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          }
        },
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/auth/me",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "me"]
            }
          }
        }
      ]
    },
    {
      "name": "User Management",
      "item": [
        {
          "name": "Update Profile",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "fullName",
                  "value": "Jane Doe",
                  "type": "text"
                },
                {
                  "key": "email",
                  "value": "newemail@example.com",
                  "type": "text"
                },
                {
                  "key": "avatar",
                  "type": "file",
                  "src": "<select file>"
                }
              ]
            },
            "url": {
              "raw": "{{base_url}}/api/users/profile",
              "host": ["{{base_url}}"],
              "path": ["api", "users", "profile"]
            }
          }
        },
        {
          "name": "Get All Users (Admin)",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/users",
              "host": ["{{base_url}}"],
              "path": ["api", "users"]
            }
          }
        },
        {
          "name": "Get User by ID (Admin)",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/users/1",
              "host": ["{{base_url}}"],
              "path": ["api", "users", "1"]
            }
          }
        },
        {
          "name": "Update User Role (Admin)",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"role\": \"OWNER\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/users/1/role",
              "host": ["{{base_url}}"],
              "path": ["api", "users", "1", "role"]
            }
          }
        },
        {
          "name": "Delete User (Admin)",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{admin_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/users/1",
              "host": ["{{base_url}}"],
              "path": ["api", "users", "1"]
            }
          }
        }
      ]
    }
  ]
}
```

## Variables untuk Postman

Tạo environment với các variable sau:

```
base_url: http://localhost:3000
token: <paste token từ login response>
admin_token: <paste admin token>
```

## Test Scenarios

### 1. Đăng ký tài khoản mới

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Đăng ký thành công",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "CUSTOMER"
  }
}
```

### 2. Đăng nhập

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatar": null,
      "role": "CUSTOMER"
    }
  }
}
```

### 3. Cập nhật profile với avatar

```bash
curl -X PATCH http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -F "fullName=Jane Doe" \
  -F "avatar=@/path/to/image.jpg"
```

### 4. Lấy thông tin user hiện tại

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

## Xác thực lỗi

### Test email đã tồn tại

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'
```

**Expected Response (409):**
```json
{
  "status": "error",
  "message": "Email đã được đăng ký"
}
```

### Test mật khẩu sai

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response (401):**
```json
{
  "status": "error",
  "message": "Email hoặc mật khẩu sai"
}
```

### Test không có token (Protected Route)

```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Expected Response (401):**
```json
{
  "message": "Bạn cần đăng nhập"
}
```

### Test token không hợp lệ

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response (401):**
```json
{
  "message": "Token không hợp lệ"
}
```

### Test không có quyền (ADMIN)

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <customer_token>"
```

**Expected Response (403):**
```json
{
  "message": "Bạn không có quyền truy cập"
}
```

## Notes

- Token hết hạn sau 7 ngày
- Avatar upload tối đa 5MB
- Chỉ hỗ trợ format: JPEG, JPG, PNG, GIF
- Password được hash bằng bcryptjs với salt = 10
- Tất cả response được format với `status`, `message`, và `data`
