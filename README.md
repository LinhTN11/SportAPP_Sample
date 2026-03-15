# SportApp Backend - Phase 2: Authentication & User Management

## Yêu cầu

- Node.js >= 14
- PostgreSQL >= 12
- npm hoặc yarn

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo file `.env`

Tạo file `.env` dựa trên `.env.example`:

```bash
cp .env.example .env
```

Cập nhật các giá trị:
- `DATABASE_URL`: Kết nối PostgreSQL
- `JWT_SECRET`: Secret token (nên là random string dài)
- `PORT`: Port server (mặc định 3000)

### 3. Khởi tạo database

```bash
npx prisma migrate dev --name init
```

### 4. Tạo thư mục uploads

```bash
mkdir -p uploads/avatars
```

### 5. Chạy server

```bash
npm run dev
```

Server sẽ chạy trên `http://localhost:3000`

## API Endpoints

### Authentication

#### Đăng ký
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }
  ```
- **Response (201):**
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

#### Đăng nhập
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200):**
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

#### Lấy thông tin user hiện tại
- **GET** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatar": null,
      "role": "CUSTOMER",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
  ```

### User Management

#### Cập nhật profile
- **PATCH** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body (multipart/form-data):**
  ```
  - fullName: "Jane Doe" (optional)
  - email: "newemail@example.com" (optional)
  - avatar: <file> (optional, max 5MB)
  ```
- **Response (200):**
  ```json
  {
    "status": "success",
    "message": "Cập nhật profile thành công",
    "data": {
      "id": 1,
      "email": "newemail@example.com",
      "fullName": "Jane Doe",
      "avatar": "uploads/avatars/1-1234567890.jpg",
      "role": "CUSTOMER",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  }
  ```

#### Lấy danh sách tất cả users (ADMIN only)
- **GET** `/api/users`
- **Headers:** `Authorization: Bearer <token>` (Admin token)
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 1,
        "email": "user1@example.com",
        "fullName": "User One",
        "avatar": null,
        "role": "CUSTOMER",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
  ```

#### Lấy user theo ID (ADMIN only)
- **GET** `/api/users/:id`
- **Headers:** `Authorization: Bearer <token>` (Admin token)
- **Response (200):**
  ```json
  {
    "status": "success",
    "data": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatar": null,
      "role": "CUSTOMER",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
  ```

#### Cập nhật vai trò user (ADMIN only)
- **PATCH** `/api/users/:id/role`
- **Headers:** `Authorization: Bearer <token>` (Admin token)
- **Body:**
  ```json
  {
    "role": "OWNER"
  }
  ```
- **Response (200):**
  ```json
  {
    "status": "success",
    "message": "Cập nhật vai trò thành công",
    "data": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "OWNER"
    }
  }
  ```

#### Xóa user (ADMIN only)
- **DELETE** `/api/users/:id`
- **Headers:** `Authorization: Bearer <token>` (Admin token)
- **Response (200):**
  ```json
  {
    "status": "success",
    "message": "Xóa người dùng thành công"
  }
  ```

## Roles

- **CUSTOMER**: Người dùng thường (mặc định)
- **OWNER**: Chủ sân (quản lý sân của mình)
- **ADMIN**: Quản trị viên hệ thống

## Middleware

### Protect
Kiểm tra JWT token từ header `Authorization: Bearer <token>`

### Authorize (...roles)
Kiểm tra quyền truy cập dựa trên role

## File Upload

- Kiểu file: JPEG, JPG, PNG, GIF
- Dung lượng tối đa: 5MB
- Lưu tại: `uploads/avatars/`

## Lỗi thường gặp

| Status | Lỗi |
|--------|-----|
| 400 | Dữ liệu không hợp lệ |
| 401 | Cần đăng nhập / Token không hợp lệ |
| 403 | Không có quyền truy cập |
| 404 | Không tìm thấy |
| 409 | Email đã tồn tại |
| 500 | Lỗi server |

## Bảo mật

- Mật khẩu được hash bằng bcryptjs
- JWT token hết hạn sau 7 ngày
- File upload được filter theo loại
- CORS được cấu hình
- Helmet cho security headers

## Development

Sử dụng nodemon để tự động reload:

```bash
npm run dev
```

## Production

```bash
npm start
```
