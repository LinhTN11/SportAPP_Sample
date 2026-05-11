# Setup Guide

Follow these steps to set up the SportApp development environment on your local machine.

## Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL**
- **Redis** (required for Socket.io adapter and BullMQ)
- **Git**

## 1. Clone the Repository
```bash
git clone <repository_url>
cd SportApp
```

## 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

### Environment Variables
Create a `.env` file in the `backend/` root directory. Use the provided sample (if any) or ensure the following core variables are set:
```env
PORT=...
DATABASE_URL="postgresql://user:password@localhost:5432/sportapp?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_jwt_secret"
# Add other required API keys and configuration
```

### Database Initialization
Run Prisma migrations to set up the database schema and generate the Prisma Client:
```bash
npx prisma migrate dev
npx prisma generate
```
*(Optional)* Seed the database with initial data:
```bash
npm run prisma:seed
```

### Run the Backend Server
```bash
npm run dev
```
The server should start on the configured port.

## 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

### Environment Variables
Create a `.env.local` file in the `frontend/` root directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:<backend_port>/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:<backend_port>"
# Add other required frontend configurations
```

### Run the Frontend Development Server
```bash
npm run dev
```
Access the application by navigating to `http://localhost:3000` in your browser.

## Troubleshooting
- **Redis Connection Error:** Ensure your local Redis server is running and accessible on the default port (6379) or the port specified in `REDIS_URL`.
- **Database Connection Error:** Verify your `DATABASE_URL` credentials in the backend `.env` file and ensure PostgreSQL is running.
