# Healthcare Management Backend Assignment

This repository contains the backend implementation for the Healthcare Management REST API, upgraded to use Dockerized PostgreSQL with support for local development and cloud deployment to Render or Vercel.

---

## Project Structure

```text
healthcare-backend/
  src/
    config/
      env.js             # Environment variable parsing, validation, JWT & SSL support
      db.js              # pg.Pool singleton, connection verification & query wrapper
    middleware/
      authenticate.js    # JWT Bearer token authentication middleware (HS256)
      errorHandler.js    # Centralized JSON error handling
      notFound.js        # Standardized 404 JSON response
    modules/
      auth/
        auth.routes.js     # Register, Login, and Me endpoints
        auth.controller.js # HTTP request/response handler
        auth.service.js    # Database queries, bcrypt hashing, JWT issuance
        auth.validation.js # Zod schemas for input validation
      patients/
        patient.routes.js     # Patient CRUD routes with trailing-slash support
        patient.controller.js # Patient HTTP request/response handler
        patient.service.js    # Multi-tenant SQL queries with user ownership enforcement
        patient.validation.js # Zod schemas for body and ID validation
      doctors/
        doctor.routes.js      # Doctor CRUD routes with shared access model
        doctor.controller.js  # Doctor HTTP request/response handler
        doctor.service.js     # Doctor SQL operations & conflict handling
        doctor.validation.js  # Doctor Zod schemas and positive ID validation
      mappings/
        mapping.routes.js     # Patient-Doctor mapping routes
        mapping.controller.js # Mapping HTTP request/response handler
        mapping.service.js    # Multi-tenant mapping SQL transactions & queries
        mapping.validation.js # Mapping Zod schemas and parameter validation
    routes/
      index.js           # API discovery and route mounting
    app.js               # Express application initialization (Helmet, CORS)
    server.js            # Server startup, DB pre-flight check, 0.0.0.0 binding & graceful shutdown
  migrations/
    1700000000000_initial-schema-baseline.js  # Schema baseline migration
    1700000001000_create-users-table.js       # Phase 2 users table migration
    1700000002000_create-patients-table.js    # Phase 3 patients table migration
    1700000003000_create-doctors-table.js     # Phase 4 doctors table migration
    1700000004000_create-patient-doctors-table.js # Phase 5 patient_doctors table migration
  tests/
    auth.test.js         # Jest & Supertest authentication test suite
    health.test.js       # Jest & Supertest health check test suite
    patient.test.js      # Jest & Supertest patient management test suite
    doctor.test.js       # Jest & Supertest doctor management test suite
    mapping.test.js      # Jest & Supertest patient-doctor mapping test suite
  .env.example           # Environment template with placeholder values
  docker-compose.yml     # Docker Compose for PostgreSQL 16 container
  package.json           # Scripts and dependencies
docker-compose.yml       # Root Docker Compose service
package.json             # Root forwarding scripts
README.md                # Project overview and quick start
```

---

## Quick Start (Local Docker Development)

All commands can be run from this root directory or from `healthcare-backend/`:

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env
# Linux / macOS
cp .env.example .env
```
*(Development defaults are pre-configured: `PORT=5001`, `DB_PORT=5434`, `DB_USER=postgres`, `DB_NAME=healthcare_db`)*

### 2. Start PostgreSQL in Docker
```bash
npm run docker:up
```

Verify container status:
```bash
npm run docker:status
```

### 3. Verify Database Connectivity & Run Migrations
```bash
npm run db:check
npm run migrate:up
```

### 4. Run Automated Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```

Visit the health endpoint in your browser or terminal:
```bash
curl http://localhost:5001/api/health
```

---

## Postman Collection

A complete, importable Postman Collection v2.1.0 is included at:
[`docs/Healthcare-Backend.postman_collection.json`](file:///c:/Akshay/Assignments/WhatByte_Assignment/docs/Healthcare-Backend.postman_collection.json)

- Configurable `baseUrl` variable (`http://localhost:5001` default)
- Auto-extracts JWT token from `POST /api/auth/login` to `{{token}}` variable
- Covers all 15 required endpoints across Authentication, Patients, Doctors, and Mappings

---

## All 15 Required API Endpoints

| Category | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :---: |
| **Auth** | `POST` | `/api/auth/register/` | Register new user account | No |
| **Auth** | `POST` | `/api/auth/login/` | Authenticate & retrieve JWT | No |
| **Patients** | `POST` | `/api/patients/` | Create owned patient | Yes (JWT) |
| **Patients** | `GET` | `/api/patients/` | List caller's patients | Yes (JWT) |
| **Patients** | `GET` | `/api/patients/:id/` | Retrieve owned patient | Yes (JWT) |
| **Patients** | `PUT` | `/api/patients/:id/` | Update owned patient | Yes (JWT) |
| **Patients** | `DELETE` | `/api/patients/:id/` | Delete owned patient | Yes (JWT) |
| **Doctors** | `POST` | `/api/doctors/` | Create doctor in shared catalog | Yes (JWT) |
| **Doctors** | `GET` | `/api/doctors/` | List all doctors | Yes (JWT) |
| **Doctors** | `GET` | `/api/doctors/:id/` | Retrieve doctor by ID | Yes (JWT) |
| **Doctors** | `PUT` | `/api/doctors/:id/` | Update doctor by ID | Yes (JWT) |
| **Doctors** | `DELETE` | `/api/doctors/:id/` | Delete doctor by ID | Yes (JWT) |
| **Mappings** | `POST` | `/api/mappings/` | Assign doctor to owned patient | Yes (JWT) |
| **Mappings** | `GET` | `/api/mappings/` | List mappings for caller's patients | Yes (JWT) |
| **Mappings** | `GET` | `/api/mappings/:patient_id/` | Get doctors for specific patient | Yes (JWT) |
| **Mappings** | `DELETE` | `/api/mappings/:id/` | Remove doctor assignment | Yes (JWT) |

*(Trailing slashes are optionally supported on all routes)*

---

## Cloud Deployment (Render & Vercel)
For complete instructions on:
- Setting up a managed PostgreSQL database on Render
- Internal vs External connection strings
- SSL configuration
- Serverless deployment on Vercel
- Migrating data from an existing local PostgreSQL installation with `pg_dump`

See the detailed documentation in [`healthcare-backend/README.md`](file:///c:/Akshay/Assignments/WhatByte_Assignment/healthcare-backend/README.md).

