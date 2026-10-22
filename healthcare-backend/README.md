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
      errorHandler.js    # Centralized JSON error handling & production stack hiding
      notFound.js        # Standardized 404 JSON response for unknown routes
    routes/
      index.js           # API root discovery and health check routes
    app.js               # Express application initialization, Helmet & CORS
    server.js            # Server startup, database pre-flight check, 0.0.0.0 host & graceful shutdown
  migrations/
    1700000000000_initial-schema-baseline.js  # Baseline schema versioning table
  tests/
    health.test.js       # Jest & Supertest automated test suite
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

### 5. Standard Error Contract
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

## 8. Common Setup Failures and Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `bind: An attempt was made to access a socket in a way forbidden by its access permissions` | Port `5432` is already in use by a local PostgreSQL service or another Docker container. | Change `DB_PORT=5434` in `.env`. The Docker container and application will communicate on port 5434 seamlessly. |
| `Container healthcare-postgres is unhealthy` | The container was unable to initialize PostgreSQL. | Check container logs: `npm run docker:logs`. Ensure volume permissions and `POSTGRES_PASSWORD` are valid. |
| `[ENVIRONMENT ERROR] Missing PostgreSQL database configuration` | `.env` was not found or lacks required variables. | Ensure `.env` exists in `healthcare-backend/` or root directory with `DATABASE_URL` or `DB_HOST`/`DB_USER`/`DB_NAME`. |
| `EADDRINUSE: address already in use 0.0.0.0:5000` | Port 5000 is occupied by another local application. | Change `PORT=5001` in your `.env` file. |
| `self-signed certificate in certificate chain` (on cloud providers) | Managed PostgreSQL uses a self-signed TLS certificate. | Set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` in `.env` for that specific provider. |
| `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` | Password in `.env` is empty or undefined. | Set `DB_PASSWORD` in `.env` and verify `DATABASE_URL` matches. |
