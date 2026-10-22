const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');
const env = require('../src/config/env');

describe('Healthcare Management Backend - Phase 2 Authentication Tests', () => {
  const TEST_EMAIL = 'testuser.auth@test.example.com';
  const TEST_PASSWORD = 'SecurePassword123!';
  const TEST_NAME = 'Jane Doe';

  beforeAll(async () => {
    // Clean up any stale test user data from prior runs
    await db.query("DELETE FROM users WHERE email LIKE '%@test.example.com';");
  });

  afterAll(async () => {
    // Clean up test users and close db pool
    await db.query("DELETE FROM users WHERE email LIKE '%@test.example.com';");
    await db.closeDb();
  });

  describe('1. POST /api/auth/register', () => {
    it('should register a new user successfully with HTTP 201 and sanitized output', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: `  ${TEST_NAME}  `, // test trimming
          email: '  TESTUSER.AUTH@TEST.EXAMPLE.COM  ', // test lowercase normalization
          password: TEST_PASSWORD,
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(TEST_NAME);
      expect(res.body.data.email).toBe(TEST_EMAIL);
      expect(res.body.data).toHaveProperty('createdAt');

      // Security assertion: Never expose password or hash
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.password_hash).toBeUndefined();
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should store a secure bcrypt hash and NOT plaintext password in the database', async () => {
      const dbResult = await db.query(
        'SELECT password_hash FROM users WHERE email = $1;',
        [TEST_EMAIL]
      );

      expect(dbResult.rows.length).toBe(1);
      const { password_hash } = dbResult.rows[0];

      // Verify bcrypt hash structure ($2a$ or $2b$)
      expect(password_hash).toMatch(/^\$2[ab]\$\d+\$/);
      // Ensure plaintext password is not in database
      expect(password_hash).not.toBe(TEST_PASSWORD);
      expect(password_hash).not.toContain(TEST_PASSWORD);
    });

    it('should reject duplicate email registration with HTTP 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: TEST_EMAIL, // already registered
          password: 'AnotherPassword456!',
        })
        .expect('Content-Type', /json/)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('code', 'EMAIL_EXISTS');
      expect(res.body.error.message).toMatch(/already registered/i);
    });

    it('should support trailing slash route POST /api/auth/register/', async () => {
      const uniqueEmail = 'trailing.slash@test.example.com';
      const res = await request(app)
        .post('/api/auth/register/')
        .send({
          name: 'Slash User',
          email: uniqueEmail,
          password: TEST_PASSWORD,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(uniqueEmail);
    });

    describe('Registration Input Validation (HTTP 400)', () => {
      it('should reject registration when name is missing or empty', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: '   ',
            email: 'valid.email@test.example.com',
            password: TEST_PASSWORD,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject registration with invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Valid Name',
            email: 'not-an-email',
            password: TEST_PASSWORD,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject registration with password shorter than 8 characters', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Valid Name',
            email: 'short.pass@test.example.com',
            password: 'short',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject registration with password longer than 72 characters (bcrypt limit)', async () => {
        const longPassword = 'A'.repeat(73);
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Valid Name',
            email: 'long.pass@test.example.com',
            password: longPassword,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('2. POST /api/auth/login', () => {
    it('should authenticate user and return HTTP 200 with JWT token and user info', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.user.name).toBe(TEST_NAME);

      // Verify security: No password hash returned
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      // Verify token payload
      const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
      expect(decoded.sub).toBe(String(res.body.data.user.id));
      expect(decoded.email).toBe(TEST_EMAIL);
    });

    it('should authenticate when email is provided with mixed case (normalization test)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TESTUSER.AUTH@TEST.EXAMPLE.COM',
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should support trailing slash route POST /api/auth/login/', async () => {
      const res = await request(app)
        .post('/api/auth/login/')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return HTTP 401 for incorrect password with generic error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: 'WrongPassword999!',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return HTTP 401 for non-existent email with the SAME generic error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doesnotexist@test.example.com',
          password: TEST_PASSWORD,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      // Constant message prevents user enumeration attacks
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return HTTP 400 if email or password are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          // password omitted
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. JWT Authentication Middleware (authenticate.js)', () => {
    let validToken;
    let userId;

    beforeAll(async () => {
      // Login to get a valid token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

      validToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('should allow access to protected route with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual({
        id: String(userId),
        email: TEST_EMAIL,
      });
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/header is missing/i);
    });

    it('should return 401 when Authorization format is not "Bearer <token>"', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Basic ${validToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/must follow "Bearer <token>"/i);
    });

    it('should return 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is expired', async () => {
      // Create an already-expired token
      const expiredToken = jwt.sign(
        { sub: '1', email: 'expired@test.example.com' },
        env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/expired/i);
    });

    it('should return 401 when token has an invalid signature (tampered secret)', async () => {
      const tamperedToken = jwt.sign(
        { sub: '1', email: 'tampered@test.example.com' },
        'wrong_unauthorized_secret_key_1234567890',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/invalid token signature/i);
    });
  });
});
