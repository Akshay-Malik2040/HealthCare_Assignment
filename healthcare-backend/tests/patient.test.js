const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Healthcare Management Backend - Phase 3 Patient Management Tests', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;

  const userAEmail = 'usera.patient@test.example.com';
  const userBEmail = 'userb.patient@test.example.com';
  const userPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Clean up test data from any previous runs
    await db.query("DELETE FROM users WHERE email IN ($1, $2);", [userAEmail, userBEmail]);

    // Register User A
    const regARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User A',
        email: userAEmail,
        password: userPassword,
      });

    userAId = regARes.body.data.id;

    // Login User A
    const loginARes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAEmail,
        password: userPassword,
      });

    userAToken = loginARes.body.data.token;

    // Register User B
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: userBEmail,
        password: userPassword,
      });

    userBId = regBRes.body.data.id;

    // Login User B
    const loginBRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userBEmail,
        password: userPassword,
      });

    userBToken = loginBRes.body.data.token;
  });

  afterAll(async () => {
    // Cascading delete: deleting users automatically cleans up all their patients
    await db.query("DELETE FROM users WHERE email IN ($1, $2);", [userAEmail, userBEmail]);
    await db.closeDb();
  });

  describe('1. Create Patient (POST /api/patients)', () => {
    it('should create a patient successfully with valid data and HTTP 201', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Rahul Sharma',
          age: 28,
          gender: 'male',
          address: 'Delhi, India',
          phone: '+91 9876543210',
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.user_id).toBe(userAId);
      expect(res.body.data.name).toBe('Rahul Sharma');
      expect(res.body.data.age).toBe(28);
      expect(res.body.data.gender).toBe('male');
      expect(res.body.data.address).toBe('Delhi, India');
      expect(res.body.data.phone).toBe('+91 9876543210');
      expect(res.body.data).toHaveProperty('created_at');
      expect(res.body.data).toHaveProperty('updated_at');
    });

    it('should support trailing slash route POST /api/patients/', async () => {
      const res = await request(app)
        .post('/api/patients/')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Priya Patel',
          age: 32,
          gender: 'female',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Priya Patel');
    });

    it('should reject unauthenticated patient creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Anonymous Patient',
          age: 40,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should ignore client-supplied user_id and use authoritative token identity', async () => {
      const spoofedUserId = 999999;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Spoof Test Patient',
          age: 25,
          user_id: spoofedUserId, // attempt to assign to another user
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Owner must remain User A, never the spoofed user ID
      expect(res.body.data.user_id).toBe(userAId);
      expect(res.body.data.user_id).not.toBe(spoofedUserId);
    });

    describe('Creation Validation Failures (HTTP 400)', () => {
      it('should reject missing or empty name', async () => {
        const res = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: '   ',
            age: 25,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing age', async () => {
        const res = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'No Age Patient',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject negative age', async () => {
        const res = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Negative Age',
            age: -5,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject age exceeding 150', async () => {
        const res = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Ancient Patient',
            age: 151,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('2. List Patients (GET /api/patients)', () => {
    it('should return only the authenticated user patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify all returned patients belong exclusively to User A
      res.body.data.forEach((patient) => {
        expect(patient.user_id).toBe(userAId);
      });
    });

    it('should support trailing slash route GET /api/patients/', async () => {
      const res = await request(app)
        .get('/api/patients/')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return an empty list for a user with no patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should reject unauthenticated list request with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/patients')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Retrieve Patient (GET /api/patients/:id)', () => {
    let patientAId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Patient For Read Test',
          age: 45,
          gender: 'female',
        });
      patientAId = res.body.data.id;
    });

    it('should retrieve an owned patient successfully with HTTP 200', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patientAId);
      expect(res.body.data.user_id).toBe(userAId);
      expect(res.body.data.name).toBe('Patient For Read Test');
    });

    it('should support trailing slash route GET /api/patients/:id/', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientAId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patientAId);
    });

    it('should return HTTP 404 when retrieving another user patient', async () => {
      // User B attempts to access User A's patient
      const res = await request(app)
        .get(`/api/patients/${patientAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Patient not found');
    });

    it('should return HTTP 404 for nonexistent patient ID', async () => {
      const res = await request(app)
        .get('/api/patients/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 for malformed non-integer ID', async () => {
      const res = await request(app)
        .get('/api/patients/abc-not-an-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP 400 for negative or zero ID', async () => {
      const res = await request(app)
        .get('/api/patients/0')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Update Patient (PUT /api/patients/:id)', () => {
    let patientToUpdateId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Original Patient Name',
          age: 50,
          gender: 'male',
          address: 'Old Address',
          phone: '1111111111',
        });
      patientToUpdateId = res.body.data.id;
    });

    it('should update an owned patient with HTTP 200 and updated fields', async () => {
      const res = await request(app)
        .put(`/api/patients/${patientToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Updated Patient Name',
          age: 51,
          gender: 'male',
          address: 'New Address, Mumbai',
          phone: '2222222222',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patientToUpdateId);
      expect(res.body.data.user_id).toBe(userAId);
      expect(res.body.data.name).toBe('Updated Patient Name');
      expect(res.body.data.age).toBe(51);
      expect(res.body.data.address).toBe('New Address, Mumbai');
      expect(res.body.data.phone).toBe('2222222222');
    });

    it('should support trailing slash route PUT /api/patients/:id/', async () => {
      const res = await request(app)
        .put(`/api/patients/${patientToUpdateId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Updated With Slash',
          age: 52,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated With Slash');
    });

    it('should ignore body attempt to overwrite user_id or id in PUT update', async () => {
      const res = await request(app)
        .put(`/api/patients/${patientToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Reassignment Attempt',
          age: 53,
          user_id: userBId, // attempt to reassign ownership
          id: 999999, // attempt to change primary key
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patientToUpdateId);
      expect(res.body.data.user_id).toBe(userAId);
    });

    it('should return HTTP 404 when User B attempts to update User A patient', async () => {
      const res = await request(app)
        .put(`/api/patients/${patientToUpdateId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'Hacked Patient Name',
          age: 99,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Verify in DB that User A's patient was NOT modified
      const checkDb = await db.query('SELECT name FROM patients WHERE id = $1;', [patientToUpdateId]);
      expect(checkDb.rows[0].name).not.toBe('Hacked Patient Name');
    });

    it('should return HTTP 400 when PUT payload fails validation', async () => {
      const res = await request(app)
        .put(`/api/patients/${patientToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: '', // invalid empty name
          age: -10, // invalid negative age
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('5. Delete Patient (DELETE /api/patients/:id)', () => {
    let patientToDeleteId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Patient To Be Deleted',
          age: 60,
        });
      patientToDeleteId = res.body.data.id;
    });

    it('should return HTTP 404 when User B attempts to delete User A patient', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientToDeleteId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Verify patient still exists in database
      const checkDb = await db.query('SELECT id FROM patients WHERE id = $1;', [patientToDeleteId]);
      expect(checkDb.rows.length).toBe(1);
    });

    it('should delete owned patient with HTTP 204 No Content', async () => {
      await request(app)
        .delete(`/api/patients/${patientToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      // Verify subsequent GET returns 404
      const getRes = await request(app)
        .get(`/api/patients/${patientToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(getRes.body.success).toBe(false);
    });

    it('should support trailing slash route DELETE /api/patients/:id/', async () => {
      await request(app)
        .delete(`/api/patients/${patientToDeleteId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);
    });

    it('should return HTTP 400 when attempting to delete with malformed ID', async () => {
      const res = await request(app)
        .delete('/api/patients/not-an-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
