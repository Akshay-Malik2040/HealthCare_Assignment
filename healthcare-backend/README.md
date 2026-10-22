# Healthcare Management Backend - Phase 1 Foundation & Docker PostgreSQL

This repository contains the backend foundation for the Healthcare Management System REST API, built using Node.js, Express, PostgreSQL (`pg`), Docker Compose, and database migrations with `node-pg-migrate`.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or later (v20+ recommended). Tested on Node.js v22.
- **npm**: v9.0.0 or later (npm v11 tested).
- **Docker & Docker Compose**: Docker Desktop (v20+ or v29+) with Docker Compose v2/v5.

---

## 2. Project Architecture & Structure

The codebase cleanly separates the Express application initialization from the HTTP server lifecycle, enabling automated testing without port binding and seamless cloud deployment to both container hosts (Render) and serverless platforms (Vercel).

```text
healthcare-backend/
  src/
    config/
      env.js             # Environment variable parsing, validation, SSL & URL synchronization
      db.js              # pg.Pool singleton, connection verification, query wrapper & SSL handling
    middleware/
      authenticate.js    # Reusable JWT authentication middleware (HS256)
      errorHandler.js    # Centralized JSON error handling & constraint conflict mapping
      notFound.js        # Standardized 404 JSON response for unknown routes
    modules/
      auth/
        auth.routes.js     # Register, Login, Me routes
        auth.controller.js # Auth HTTP handler
        auth.service.js    # Auth SQL operations & bcrypt hashing
        auth.validation.js # Auth Zod schemas
      patients/
        patient.routes.js     # Patient CRUD routes (multi-tenant)
        patient.controller.js # Patient HTTP handler
        patient.service.js    # Multi-tenant SQL queries (user-owned)
        patient.validation.js # Patient Zod schemas
      doctors/
        doctor.routes.js      # Doctor CRUD routes (shared access model)
        doctor.controller.js  # Doctor HTTP handler
        doctor.service.js     # Doctor SQL operations & conflict handling
        doctor.validation.js  # Doctor Zod schemas & ID validation
    routes/
      index.js           # API root discovery and route mounting
    app.js               # Express application initialization, Helmet & CORS
    server.js            # Server startup, database pre-flight check, 0.0.0.0 host & graceful shutdown
  migrations/
    1700000000000_initial-schema-baseline.js  # Baseline schema versioning table
    1700000001000_create-users-table.js       # Phase 2 users table migration
    1700000002000_create-patients-table.js    # Phase 3 patients table migration
    1700000003000_create-doctors-table.js     # Phase 4 doctors table migration
  tests/
    auth.test.js         # Phase 2 authentication integration test suite
    health.test.js       # Phase 1 foundation & health check test suite
    patient.test.js      # Phase 3 patient management integration test suite
    doctor.test.js       # Phase 4 doctor management integration test suite
  .env.example           # Environment variable template with complete placeholders
  .gitignore             # Ignores .env, node_modules, coverage, logs
  docker-compose.yml     # PostgreSQL 16 container definition with persistent volume & healthcheck
  package.json           # Scripts and dependencies
  README.md              # Project documentation
```

---

## 3. Quick Start with Docker PostgreSQL

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
# On Linux/macOS:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Review `.env` settings:
```env
PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Docker & Database Settings
POSTGRES_VERSION=16-alpine
DB_HOST=localhost
DB_PORT=5434
DB_USER=postgres
DB_PASSWORD=healthcare_dev_secure_pass_123
DB_NAME=healthcare_db

DATABASE_URL=postgres://postgres:healthcare_dev_secure_pass_123@localhost:5434/healthcare_db

# Pool Settings
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

# SSL Settings (false for local Docker, true for cloud providers like Render)
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

> **Note on Port Selection:** `DB_PORT` defaults to `5434` in `.env` to prevent port collisions if you already have a local PostgreSQL service or another Docker container bound to `5432`. If your port `5432` is free, you can set `DB_PORT=5432`.

### Step 3: Start Docker PostgreSQL
Start the PostgreSQL container in the background:
```bash
npm run docker:up
# (Equivalent to: docker compose up -d)
```

Verify the container status and healthcheck:
```bash
npm run docker:status
# (Equivalent to: docker compose ps)
```
You should see:
```text
NAME                  IMAGE                STATUS                   PORTS
healthcare-postgres   postgres:16-alpine   Up (healthy)             127.0.0.1:5434->5432/tcp
```

### Step 4: Test Database Connectivity
Test connectivity to the Docker database container:
```bash
npm run db:check
```
Output:
```json
{
  "ok": true,
  "latencyMs": 35
}
```

### Step 5: Run Database Migrations
Apply the initial schema baseline to the Docker database:
```bash
npm run migrate:up
```

To roll back the last applied migration:
```bash
npm run migrate:down
```

### Step 6: Start the Express Development Server
```bash
npm run dev
# (or npm start for production mode)
```

The server binds to `0.0.0.0` on your configured `PORT`:
```text
====================================================
  Healthcare Management Backend - Phase 1 Foundation
====================================================
[DATABASE] Verifying initial connection to PostgreSQL...
[DATABASE] Connection established successfully (31ms latency).
[SERVER] Express server running at http://0.0.0.0:5001 in development mode.
[SERVER] Health Check: http://localhost:5001/api/health
[SERVER] API Root:     http://localhost:5001/api
```

---

## 4. Development & Operation Commands

| Command | Action |
| :--- | :--- |
| `npm run docker:up` | Starts the PostgreSQL Docker container with persistent storage (`docker compose up -d`). |
| `npm run docker:status` | Shows the container status and health check state (`docker compose ps`). |
| `npm run docker:logs` | Streams PostgreSQL container logs (`docker compose logs -f postgres`). |
| `npm run docker:stop` | Stops the PostgreSQL container gracefully without deleting the volume (`docker compose stop`). |
| `npm run db:check` | Runs an isolated connectivity test against the configured database. |
| `npm run migrate:up` | Executes all pending SQL migrations using `node-pg-migrate`. |
| `npm run migrate:down` | Rolls back the most recently applied migration. |
| `npm run dev` | Starts the Express server with live reloading via `nodemon`. |
| `npm start` | Starts the Express server in production mode. |
| `npm test` | Runs the full automated test suite with Jest and Supertest. |
| `npm run test:coverage` | Runs tests and prints code coverage statistics. |

> **IMPORTANT WARNING:** Never run `docker compose down -v` as a routine command, because the `-v` flag permanently deletes the named volume `healthcare_postgres_data` and all data within it. Use `npm run docker:stop` or `docker compose stop` to pause the database.

---

## 5. Procedure for Migrating Existing Local PostgreSQL Data

If you have existing data in your machine's local PostgreSQL installation that you want to transfer into the new Docker container:

### Step 1: Export Local PostgreSQL Data
Using `pg_dump`, create a dump of your local database:
```bash
pg_dump -U postgres -h localhost -p 5432 -d healthcare_db -F c -b -v -f healthcare_backup.dump
```
*(Alternatively, for plain SQL format: `pg_dump -U postgres -h localhost -p 5432 -d healthcare_db > backup.sql`)*

### Step 2: Ensure Docker PostgreSQL is Running
```bash
npm run docker:up
```

### Step 3: Restore Data into Docker Container
Restore the dump file directly into the running Docker container:
```bash
# For custom format (.dump):
docker exec -i healthcare-postgres pg_restore -U postgres -d healthcare_db -v < healthcare_backup.dump

# Or for plain SQL (.sql):
docker exec -i healthcare-postgres psql -U postgres -d healthcare_db < backup.sql
```

### Step 4: Verify Restored Data
Run `npm run db:check` or query your database to confirm that all records and relations are intact.

---

## 6. Cloud Deployment Guidelines

The backend is engineered to switch seamlessly between local Docker PostgreSQL and cloud-managed PostgreSQL providers without any code modifications.

### Deploying to Render

[Render](https://render.com) is the recommended deployment platform for this architecture because it provides long-running Node.js Web Services and managed PostgreSQL with internal private networking.

#### 1. Create Managed PostgreSQL on Render
1. In the Render Dashboard, click **New +** -> **PostgreSQL**.
2. Set the Name (e.g. `healthcare-db`), Database name (`healthcare_db`), and User (`postgres`).
3. Select your desired region.
4. Once provisioned, Render provides two connection URLs:
   - **Internal Database URL**: `postgres://user:password@dpg-...-a:5432/healthcare_db` (for services running on Render).
   - **External Database URL**: `postgres://user:password@dpg-...-a.oregon-postgres.render.com/healthcare_db` (for external access).

#### 2. Create Node.js Web Service on Render
1. Click **New +** -> **Web Service** and connect your GitHub/GitLab repository.
2. Configure settings:
   - **Root Directory**: `healthcare-backend` (or leave empty if deployed from root).
   - **Environment**: `Node`.
   - **Build Command**: `npm install`.
   - **Start Command**: `npm start`.
   - **Health Check Path**: `/api/health`.

#### 3. Configure Environment Variables on Render
Add the following in the Render Environment tab:
```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<Paste Render Internal Database URL>
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
CORS_ORIGIN=https://your-frontend-domain.com
```

> **Why Internal Database URL?** Render does not charge egress fees for traffic within its private network, and internal connections offer significantly lower latency and enhanced security.

---

### Deploying to Vercel

[Vercel](https://vercel.com) uses a serverless function model (AWS Lambda) rather than persistent server instances.

#### Architectural Considerations:
1. **Separation of App and Server**: Our Express app is defined in `src/app.js` and exported without calling `app.listen()`. The local listener lives in `src/server.js`. This makes `src/app.js` compatible with Vercel serverless handlers.
2. **Connection Pooling**: Serverless functions spin up and terminate dynamically. Opening a new `pg.Pool` per function execution can rapidly exhaust PostgreSQL's maximum connection limit. For Vercel, connect via a connection pooler such as **PgBouncer**, **Supabase Connection Pooler (port 6543)**, or **Neon Serverless Driver**.
3. **Vercel Handler**: If deploying to Vercel, create `api/index.js` at the repository root:
   ```javascript
   const app = require('../healthcare-backend/src/app');
   module.exports = app;
   ```
   Add a `vercel.json` rewrites configuration:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/api/index.js" }]
   }
   ```

---

## 7. Available Endpoints

### 1. Root Welcome Route
- **Method**: `GET /`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Healthcare Management API (Phase 1)",
  "apiDocumentation": "/api",
  "healthCheck": "/api/health"
}
```

### 2. API Discovery
- **Method**: `GET /api`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "name": "Healthcare Management Backend API",
    "version": "1.0.0",
    "phase": "Phase 1 - Project Foundation",
    "status": "operational",
    "endpoints": {
      "health": "/api/health"
    }
  }
}
```

### 3. Health Check (Readiness Check - default)
- **Method**: `GET /api/health`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "uptime": 120,
    "timestamp": "2026-10-22T12:30:00.000Z",
    "checks": {
      "app": "healthy",
      "database": {
        "status": "connected",
        "latencyMs": 4
      }
    }
  }
}
```

### 4. Health Check (Liveness Check)
- **Method**: `GET /api/health?check=liveness`
- **Response**: `200 OK` (checks node application responsiveness without database roundtrip)

### 5. User Registration (Phase 2)
- **Method**: `POST /api/auth/register` (also supports `/api/auth/register/`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-10-22T12:35:00.000Z"
  }
}
```
- **Duplicate Email**: Returns `409 Conflict` (`EMAIL_EXISTS`).
- **Validation Failure**: Returns `400 Bad Request` (`VALIDATION_ERROR`).

#### Example curl for Registration:
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane.doe@example.com","password":"StrongPassword123!"}'
```

### 6. User Login (Phase 2)
- **Method**: `POST /api/auth/login` (also supports `/api/auth/login/`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane.doe@example.com"
    }
  }
}
```
- **Invalid Credentials**: Returns `401 Unauthorized` (`INVALID_CREDENTIALS`, constant message prevents user enumeration).

#### Example curl for Login:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.doe@example.com","password":"StrongPassword123!"}'
```

### 7. Token Verification & Middleware Usage (Phase 2)
- **Method**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "jane.doe@example.com"
    }
  }
}
```

#### Example curl with JWT:
```bash
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 8. Patient Management APIs (Phase 3)

All patient endpoints require a valid JWT `Bearer <token>` in the `Authorization` header. Multi-tenant isolation is enforced in SQL: users can only view, update, or delete patients they own.

#### Patient Schema & Validation Rules:
- `id`: Auto-generated integer primary key.
- `user_id`: Integer foreign key referencing `users(id)` with `ON DELETE CASCADE` (deleting a user account cascades to all their patient records).
- `name`: String, required, trimmed, non-empty, 1-100 characters.
- `age`: Integer, required, non-negative, range 0 to 150.
- `gender`: String, optional/nullable, max 50 characters (e.g. `male`, `female`, `other`, `prefer_not_to_say`).
- `address`: String, optional/nullable, max 500 characters.
- `phone`: String, optional/nullable, max 30 characters.
- `created_at` / `updated_at`: Timestamps with time zone.

---

#### A. Create Patient
- **Method**: `POST /api/patients/` (or `POST /api/patients`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Rahul Sharma",
  "age": 28,
  "gender": "male",
  "address": "Delhi, India",
  "phone": "9876543210"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "Rahul Sharma",
    "age": 28,
    "gender": "male",
    "address": "Delhi, India",
    "phone": "9876543210",
    "created_at": "2026-10-22T12:50:00.000Z",
    "updated_at": "2026-10-22T12:50:00.000Z"
  }
}
```

```bash
curl -X POST http://localhost:5001/api/patients/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","age":28,"gender":"male","address":"Delhi","phone":"9876543210"}'
```

---

#### B. List Patients
- **Method**: `GET /api/patients/` (or `GET /api/patients`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Rahul Sharma",
      "age": 28,
      "gender": "male",
      "address": "Delhi, India",
      "phone": "9876543210",
      "created_at": "2026-10-22T12:50:00.000Z",
      "updated_at": "2026-10-22T12:50:00.000Z"
    }
  ]
}
```

```bash
curl -X GET http://localhost:5001/api/patients/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

#### C. Retrieve a Patient by ID
- **Method**: `GET /api/patients/:id/` (or `GET /api/patients/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (if owned by caller) or `404 Not Found` (if nonexistent or owned by another user)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "Rahul Sharma",
    "age": 28,
    "gender": "male",
    "address": "Delhi, India",
    "phone": "9876543210",
    "created_at": "2026-10-22T12:50:00.000Z",
    "updated_at": "2026-10-22T12:50:00.000Z"
  }
}
```

```bash
curl -X GET http://localhost:5001/api/patients/1/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

#### D. Update a Patient by ID
- **Method**: `PUT /api/patients/:id/` (or `PUT /api/patients/:id`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Rahul Sharma",
  "age": 29,
  "gender": "male",
  "address": "Mumbai, India",
  "phone": "9876543210"
}
```
- **Response**: `200 OK` (if owned by caller) or `404 Not Found` (if nonexistent or owned by another user)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "Rahul Sharma",
    "age": 29,
    "gender": "male",
    "address": "Mumbai, India",
    "phone": "9876543210",
    "created_at": "2026-10-22T12:50:00.000Z",
    "updated_at": "2026-10-22T12:55:00.000Z"
  }
}
```

```bash
curl -X PUT http://localhost:5001/api/patients/1/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","age":29,"gender":"male","address":"Mumbai, India","phone":"9876543210"}'
```

---

#### E. Delete a Patient by ID
- **Method**: `DELETE /api/patients/:id/` (or `DELETE /api/patients/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `204 No Content` (empty body) on success, or `404 Not Found` (if nonexistent or owned by another user)

```bash
curl -X DELETE http://localhost:5001/api/patients/1/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

### 9. Doctor Management APIs (Phase 4)

All doctor endpoints require a valid JWT `Bearer <token>` in the `Authorization` header.

#### Shared-Doctor Access Model
Under the assignment's shared-doctor model:
- Doctor records are **shared** across all authenticated users.
- Unlike patients (which are strictly user-owned and isolated), any authenticated user can view, list, create, and update doctors.
- There are no creator-based restrictions or role-based boundaries on doctor records.

#### Doctor Schema & Validation Rules:
- `id`: Auto-generated serial integer primary key. Client cannot override this.
- `name`: Required string, trimmed, non-empty, 1-100 characters.
- `specialization`: Required string, trimmed, non-empty, 1-100 characters (e.g. `Cardiology`, `Neurology`, `Pediatrics`).
- `email`: Required valid email address, trimmed, normalized to lowercase, max 255 characters. Uniqueness is enforced both in application logic and by a PostgreSQL unique constraint with an index.
- `phone`: Optional string, trimmed, max 30 characters. Kept as a string to preserve leading zeros and international formatting (e.g. `+91-9876543210`, `011-23456789`). Characters allowed: digits, spaces, hyphens, parentheses, and leading `+`.
- `created_at` / `updated_at`: Timestamps with time zone, default `current_timestamp`. Managed by the database; client-supplied timestamps are stripped.

#### Endpoints Overview

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/doctors/` | Create a new doctor | `201`, `400`, `401`, `409` |
| `GET` | `/api/doctors/` | List all doctors (newest first) | `200`, `401` |
| `GET` | `/api/doctors/:id/` | Retrieve doctor by ID | `200`, `400`, `401`, `404` |
| `PUT` | `/api/doctors/:id/` | Update doctor (full replacement) | `200`, `400`, `401`, `404`, `409` |
| `DELETE` | `/api/doctors/:id/` | Delete doctor (foreign key protected) | `204`, `400`, `401`, `404`, `409` |

*(All routes support optional trailing slashes seamlessly, e.g. `/api/doctors` and `/api/doctors/`)*

---

#### A. Create Doctor
- **Method**: `POST /api/doctors/` (or `POST /api/doctors`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "name": "Dr. Neha Sharma",
  "specialization": "Cardiology",
  "email": "neha@example.com",
  "phone": "9876543210"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dr. Neha Sharma",
    "specialization": "Cardiology",
    "email": "neha@example.com",
    "phone": "9876543210",
    "created_at": "2026-10-22T13:05:00.000Z",
    "updated_at": "2026-10-22T13:05:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (empty name, invalid email, malformed phone).
  - `401 Unauthorized`: Missing or invalid JWT.
  - `409 Conflict`: Email already registered (`code: "EMAIL_EXISTS"`).

```bash
curl -X POST http://localhost:5001/api/doctors/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Neha Sharma","specialization":"Cardiology","email":"neha@example.com","phone":"9876543210"}'
```

---

#### B. List All Doctors
- **Method**: `GET /api/doctors/` (or `GET /api/doctors`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (ordered newest first)
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Dr. Amit Verma",
      "specialization": "Neurology",
      "email": "amit@example.com",
      "phone": "+91-9876543211",
      "created_at": "2026-10-22T13:10:00.000Z",
      "updated_at": "2026-10-22T13:10:00.000Z"
    },
    {
      "id": 1,
      "name": "Dr. Neha Sharma",
      "specialization": "Cardiology",
      "email": "neha@example.com",
      "phone": "9876543210",
      "created_at": "2026-10-22T13:05:00.000Z",
      "updated_at": "2026-10-22T13:05:00.000Z"
    }
  ]
}
```

```bash
curl -X GET http://localhost:5001/api/doctors/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

#### C. Retrieve One Doctor by ID
- **Method**: `GET /api/doctors/:id/` (or `GET /api/doctors/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dr. Neha Sharma",
    "specialization": "Cardiology",
    "email": "neha@example.com",
    "phone": "9876543210",
    "created_at": "2026-10-22T13:05:00.000Z",
    "updated_at": "2026-10-22T13:05:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Malformed or non-integer ID (`code: "VALIDATION_ERROR"`).
  - `401 Unauthorized`: Missing or invalid JWT.
  - `404 Not Found`: Doctor with requested ID does not exist (`code: "NOT_FOUND"`).

```bash
curl -X GET http://localhost:5001/api/doctors/1/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

#### D. Update Doctor (Full Replacement PUT)
- **Method**: `PUT /api/doctors/:id/` (or `PUT /api/doctors/:id`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body** (all required fields must be supplied):
```json
{
  "name": "Dr. Neha Sharma",
  "specialization": "Senior Cardiology Specialist",
  "email": "neha.sharma@example.com",
  "phone": "+91-9876543210"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dr. Neha Sharma",
    "specialization": "Senior Cardiology Specialist",
    "email": "neha.sharma@example.com",
    "phone": "+91-9876543210",
    "created_at": "2026-10-22T13:05:00.000Z",
    "updated_at": "2026-10-22T13:15:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Incomplete body, invalid email format, or malformed ID.
  - `401 Unauthorized`: Missing or invalid JWT.
  - `404 Not Found`: Doctor not found.
  - `409 Conflict`: Target email already in use by another doctor (`code: "EMAIL_EXISTS"`).

```bash
curl -X PUT http://localhost:5001/api/doctors/1/ \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Neha Sharma","specialization":"Senior Cardiology Specialist","email":"neha.sharma@example.com","phone":"+91-9876543210"}'
```

---

#### E. Delete Doctor
- **Method**: `DELETE /api/doctors/:id/` (or `DELETE /api/doctors/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `204 No Content` (empty body) on success.
- **Foreign Key Protection**:
  - If patient-doctor assignments or foreign-key mappings reference the doctor, deletion is **prevented** (HTTP `409 Conflict`, code `DELETE_CONFLICT`).
  - Assignments are not silently deleted.
- **Error Responses**:
  - `400 Bad Request`: Malformed ID.
  - `401 Unauthorized`: Missing or invalid JWT.
  - `404 Not Found`: Doctor not found.
  - `409 Conflict`: Referenced by existing patient assignments (`code: "DELETE_CONFLICT"`).

```bash
curl -X DELETE http://localhost:5001/api/doctors/1/ \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

### 10. Standard Error Contract
All unknown routes and exceptions return a consistent JSON payload without internal database details or stack traces in production:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/unknown",
    "details": null
  }
}
```

---

## 11. Common Setup Failures and Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `bind: An attempt was made to access a socket in a way forbidden by its access permissions` | Port `5432` is already in use by a local PostgreSQL service or another Docker container. | Change `DB_PORT=5434` in `.env`. The Docker container and application will communicate on port 5434 seamlessly. |
| `Container healthcare-postgres is unhealthy` | The container was unable to initialize PostgreSQL. | Check container logs: `npm run docker:logs`. Ensure volume permissions and `POSTGRES_PASSWORD` are valid. |
| `[ENVIRONMENT ERROR] Missing PostgreSQL database configuration` | `.env` was not found or lacks required variables. | Ensure `.env` exists in `healthcare-backend/` or root directory with `DATABASE_URL` or `DB_HOST`/`DB_USER`/`DB_NAME`. |
| `EADDRINUSE: address already in use 0.0.0.0:5000` | Port 5000 is occupied by another local application. | Change `PORT=5001` in your `.env` file. |
| `self-signed certificate in certificate chain` (on cloud providers) | Managed PostgreSQL uses a self-signed TLS certificate. | Set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` in `.env` for that specific provider. |
| `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` | Password in `.env` is empty or undefined. | Set `DB_PASSWORD` in `.env` and verify `DATABASE_URL` matches. |
