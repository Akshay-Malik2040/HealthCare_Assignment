# Healthcare Management Backend Assignment

This repository contains the backend implementation for the Healthcare Management REST API, upgraded to use Dockerized PostgreSQL with support for local development and cloud deployment to Render or Vercel.

---

## Project Structure

```text
healthcare-backend/
  src/
    config/
      env.js             # Environment variable parsing, validation & SSL support
      db.js              # pg.Pool singleton, connection verification & query wrapper
    middleware/
      errorHandler.js    # Centralized JSON error handling
      notFound.js        # Standardized 404 JSON response
    routes/
      index.js           # API discovery and health check routes
    app.js               # Express application initialization (Helmet, CORS)
    server.js            # Server startup, DB pre-flight check, 0.0.0.0 binding & graceful shutdown
  migrations/
    1700000000000_initial-schema-baseline.js  # Schema baseline migration
  tests/
    health.test.js       # Jest & Supertest test suite
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

## Cloud Deployment (Render & Vercel)
For complete instructions on:
- Setting up a managed PostgreSQL database on Render
- Internal vs External connection strings
- SSL configuration
- Serverless deployment on Vercel
- Migrating data from an existing local PostgreSQL installation with `pg_dump`

See the detailed documentation in [`healthcare-backend/README.md`](file:///c:/Akshay/Assignments/WhatByte_Assignment/healthcare-backend/README.md).
