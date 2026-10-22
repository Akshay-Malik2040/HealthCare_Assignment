const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { validateEnv } = require('../src/config/env');

describe('Healthcare Management Backend - Phase 1 Foundation Tests', () => {
  afterAll(async () => {
    // Ensure any open handles from pool are closed after tests
    await db.closeDb();
  });

  describe('1. Root & Discovery Endpoints', () => {
    it('GET / should return 200 with API welcome info', async () => {
      const res = await request(app)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('healthCheck', '/api/health');
    });

    it('GET /api should return 200 with API metadata', async () => {
      const res = await request(app)
        .get('/api')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('phase', 'Phase 1 - Project Foundation');
    });
  });

  describe('2. Health Check Endpoint (/api/health)', () => {
    it('GET /api/health?check=liveness should return 200 and UP without querying database', async () => {
      const res = await request(app)
        .get('/api/health?check=liveness')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        data: {
          status: 'UP',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
          checks: {
            app: 'healthy',
          },
        },
      });
    });

    it('GET /api/health should return 200 and UP when database is reachable', async () => {
      const spy = jest.spyOn(db, 'checkDbConnection').mockResolvedValueOnce({
        ok: true,
        latencyMs: 3,
      });

      const res = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(res.body.data.checks.database.status).toBe('connected');
      expect(res.body.data.checks.database.latencyMs).toBe(3);

      spy.mockRestore();
    });

    it('GET /api/health should return 503 and DOWN when database is unreachable', async () => {
      const spy = jest.spyOn(db, 'checkDbConnection').mockResolvedValueOnce({
        ok: false,
        latencyMs: 15,
        error: 'Connection timeout',
      });

      const res = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(503);

      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe('DOWN');
      expect(res.body.data.checks.database.status).toBe('disconnected');
      expect(res.body.data.checks.database.error).toBe('Connection timeout');

      spy.mockRestore();
    });
  });

  describe('3. Unknown Route Handling (404)', () => {
    it('GET /api/nonexistent-route should return 404 with structured JSON error', async () => {
      const res = await request(app)
        .get('/api/nonexistent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cannot GET /api/nonexistent-route',
          details: null,
        },
      });
    });

    it('POST /unsupported-path should return 404 with structured JSON error', async () => {
      const res = await request(app)
        .post('/unsupported-path')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cannot POST /unsupported-path',
          details: null,
        },
      });
    });
  });

  describe('4. Centralized Error Handling', () => {
    it('Malformed JSON in request body should return 400 with BAD_REQUEST', async () => {
      const res = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('{"invalidJson": ')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Malformed JSON payload in request body',
          details: null,
        },
      });
    });

    it('Disallowed CORS origin should return 403 with CORS_ERROR', async () => {
      const res = await request(app)
        .get('/api')
        .set('Origin', 'http://malicious-site.example.com')
        .expect('Content-Type', /json/)
        .expect(403);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'CORS_ERROR');
      expect(res.body.error.message).toMatch(/not allowed by CORS/);
    });

    it('errorHandler middleware should suppress stack traces in production', () => {
      const errorHandler = require('../src/middleware/errorHandler');
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = {};
      const mockRes = {
        statusCode: null,
        jsonData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        },
      };

      const internalError = new Error('Sensitive internal DB stack trace');
      internalError.stack = 'Secret stack trace line 123';

      errorHandler(internalError, mockReq, mockRes, () => {});

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonData.success).toBe(false);
      expect(mockRes.jsonData.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(mockRes.jsonData.error.message).toBe('Internal server error');
      expect(mockRes.jsonData.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('5. Environment Configuration Validation', () => {
    it('validateEnv should accept valid configuration', () => {
      expect(() => {
        validateEnv({
          PORT: 8080,
          NODE_ENV: 'development',
          DATABASE_URL: 'postgres://postgres:secret@localhost:5432/test_db',
        });
      }).not.toThrow();
    });

    it('validateEnv should reject invalid PORT numbers', () => {
      expect(() => {
        validateEnv({
          PORT: 'not-a-port',
          DATABASE_URL: 'postgres://postgres:secret@localhost:5432/test_db',
        });
      }).toThrow(/PORT must be a valid number/);
    });

    it('validateEnv should reject missing database configuration', () => {
      expect(() => {
        validateEnv({
          PORT: 3000,
          DATABASE_URL: '',
          DB_HOST: '',
          DB_NAME: '',
          DB_USER: '',
        });
      }).toThrow(/Missing PostgreSQL database configuration/);
    });
  });
});
