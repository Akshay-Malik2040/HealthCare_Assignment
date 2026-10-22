const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Healthcare Management Backend - Phase 4 Doctor Management Tests', () => {
  let userAToken;
  let userBToken;

  const userAEmail = 'usera.doctor@test.example.com';
  const userBEmail = 'userb.doctor@test.example.com';
  const userPassword = 'TestPassword123!';

  // Test doctor emails for cleanup
  const testDoctorEmail1 = 'dr.neha.sharma@test.example.com';
  const testDoctorEmail2 = 'dr.amit.verma@test.example.com';
  const testDoctorEmail3 = 'dr.priya.patel@test.example.com';
  const testDoctorEmailDup = 'dr.duplicate@test.example.com';

  beforeAll(async () => {
    // Clean up any leftovers from previous test runs
    await db.query('DELETE FROM users WHERE email IN ($1, $2);', [userAEmail, userBEmail]);
    await db.query(
      'DELETE FROM doctors WHERE email IN ($1, $2, $3, $4);',
      [testDoctorEmail1, testDoctorEmail2, testDoctorEmail3, testDoctorEmailDup]
    );

    // Register User A
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Doctor Admin User A',
        email: userAEmail,
        password: userPassword,
      });

    // Login User A
    const loginARes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAEmail,
        password: userPassword,
      });
    userAToken = loginARes.body.data.token;

    // Register User B
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Doctor Viewer User B',
        email: userBEmail,
        password: userPassword,
      });

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
    // Clean up test doctors and users
    await db.query(
      'DELETE FROM doctors WHERE email IN ($1, $2, $3, $4);',
      [testDoctorEmail1, testDoctorEmail2, testDoctorEmail3, testDoctorEmailDup]
    );
    await db.query('DELETE FROM users WHERE email IN ($1, $2);', [userAEmail, userBEmail]);
    await db.closeDb();
  });

  describe('1. Create Doctor (POST /api/doctors)', () => {
    it('should create a doctor successfully with valid data and HTTP 201', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Neha Sharma',
          specialization: 'Cardiology',
          email: testDoctorEmail1,
          phone: '+91-9876543210',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Dr. Neha Sharma');
      expect(res.body.data.specialization).toBe('Cardiology');
      expect(res.body.data.email).toBe(testDoctorEmail1.toLowerCase());
      expect(res.body.data.phone).toBe('+91-9876543210');
      expect(res.body.data).toHaveProperty('created_at');
      expect(res.body.data).toHaveProperty('updated_at');
    });

    it('should support trailing slash route POST /api/doctors/', async () => {
      const res = await request(app)
        .post('/api/doctors/')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Amit Verma',
          specialization: 'Neurology',
          email: testDoctorEmail2,
          phone: '011-23456789',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dr. Amit Verma');
    });

    it('should normalize doctor email to lowercase during creation', async () => {
      const upperEmail = 'DR.PRIYA.PATEL@TEST.EXAMPLE.COM';
      const res = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Priya Patel',
          specialization: 'Pediatrics',
          email: upperEmail,
          phone: '9876501234',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testDoctorEmail3);
    });

    it('should reject unauthenticated doctor creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .send({
          name: 'Dr. Unauthenticated',
          specialization: 'General Medicine',
          email: 'unauth@test.example.com',
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should prevent client input from overriding id or timestamps', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          id: 99999,
          name: 'Dr. Duplicate Test',
          specialization: 'Dermatology',
          email: testDoctorEmailDup,
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(99999);
      expect(new Date(res.body.data.created_at).getFullYear()).toBeGreaterThan(2020);
    });

    it('should reject duplicate email on creation with HTTP 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Another Person',
          specialization: 'Oncology',
          email: testDoctorEmailDup, // already registered in previous test
          phone: '1234567890',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    describe('Creation Validation Failures (HTTP 400)', () => {
      it('should reject missing or empty doctor name', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: '   ',
            specialization: 'Cardiology',
            email: 'valid1@test.example.com',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject doctor name exceeding 100 characters', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'A'.repeat(101),
            specialization: 'Cardiology',
            email: 'valid2@test.example.com',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing or empty specialization', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Dr. Valid Name',
            specialization: '   ',
            email: 'valid3@test.example.com',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Dr. Valid Name',
            specialization: 'Cardiology',
            email: 'not-an-email-address',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid characters in phone number', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Dr. Valid Name',
            specialization: 'Cardiology',
            email: 'valid4@test.example.com',
            phone: 'INVALID-PHONE-CHARACTERS!!',
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject phone number exceeding 30 characters', async () => {
        const res = await request(app)
          .post('/api/doctors')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            name: 'Dr. Valid Name',
            specialization: 'Cardiology',
            email: 'valid5@test.example.com',
            phone: '1'.repeat(31),
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('2. List Doctors (GET /api/doctors)', () => {
    it('should return all doctor records under shared-doctor model with HTTP 200', async () => {
      const res = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      // Verify deterministic newest-first ordering
      for (let i = 0; i < res.body.data.length - 1; i++) {
        const current = new Date(res.body.data[i].created_at).getTime();
        const next = new Date(res.body.data[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should allow User B to see doctors created by User A (shared-doctor model)', async () => {
      const res = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const doctorEmails = res.body.data.map((d) => d.email);
      expect(doctorEmails).toContain(testDoctorEmail1);
      expect(doctorEmails).toContain(testDoctorEmail2);
    });

    it('should support trailing slash route GET /api/doctors/', async () => {
      const res = await request(app)
        .get('/api/doctors/')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject unauthenticated list request with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/doctors')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Retrieve Doctor by ID (GET /api/doctors/:id)', () => {
    let createdDoctorId;

    beforeAll(async () => {
      const listRes = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`);
      const doc = listRes.body.data.find((d) => d.email === testDoctorEmail1);
      createdDoctorId = doc.id;
    });

    it('should retrieve doctor successfully with HTTP 200', async () => {
      const res = await request(app)
        .get(`/api/doctors/${createdDoctorId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDoctorId);
      expect(res.body.data.name).toBe('Dr. Neha Sharma');
      expect(res.body.data.specialization).toBe('Cardiology');
      expect(res.body.data.email).toBe(testDoctorEmail1);
    });

    it('should allow User B to retrieve the same doctor (shared-doctor model)', async () => {
      const res = await request(app)
        .get(`/api/doctors/${createdDoctorId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDoctorId);
    });

    it('should support trailing slash route GET /api/doctors/:id/', async () => {
      const res = await request(app)
        .get(`/api/doctors/${createdDoctorId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDoctorId);
    });

    it('should return HTTP 404 for nonexistent doctor ID', async () => {
      const res = await request(app)
        .get('/api/doctors/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 for malformed doctor ID string', async () => {
      const res = await request(app)
        .get('/api/doctors/invalid-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP 400 for negative or zero doctor ID', async () => {
      await request(app)
        .get('/api/doctors/-5')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      await request(app)
        .get('/api/doctors/0')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);
    });

    it('should reject unauthenticated retrieval with HTTP 401', async () => {
      const res = await request(app)
        .get(`/api/doctors/${createdDoctorId}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('4. Update Doctor (PUT /api/doctors/:id)', () => {
    let doctorToUpdateId;

    beforeAll(async () => {
      const listRes = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`);
      const doc = listRes.body.data.find((d) => d.email === testDoctorEmail2);
      doctorToUpdateId = doc.id;
    });

    it('should update doctor with full replacement semantics and HTTP 200', async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Amit K. Verma',
          specialization: 'Senior Neurology',
          email: testDoctorEmail2,
          phone: '+91-9988776655',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(doctorToUpdateId);
      expect(res.body.data.name).toBe('Dr. Amit K. Verma');
      expect(res.body.data.specialization).toBe('Senior Neurology');
      expect(res.body.data.phone).toBe('+91-9988776655');
    });

    it('should support trailing slash route PUT /api/doctors/:id/', async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Amit Kumar Verma',
          specialization: 'Neurology & Neuroscience',
          email: testDoctorEmail2,
          phone: '+91-9988776655',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dr. Amit Kumar Verma');
    });

    it('should prevent PUT update from modifying id, created_at, or system fields', async () => {
      const originalDoc = await request(app)
        .get(`/api/doctors/${doctorToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          id: 77777,
          name: 'Dr. Amit Kumar Verma',
          specialization: 'Neurology',
          email: testDoctorEmail2,
          created_at: '2019-01-01T00:00:00.000Z',
        })
        .expect(200);

      expect(res.body.data.id).toBe(doctorToUpdateId);
      expect(res.body.data.created_at).toBe(originalDoc.body.data.created_at);
    });

    it('should reject duplicate email when updating another doctor (HTTP 409)', async () => {
      // testDoctorEmail1 belongs to Dr. Neha Sharma
      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Amit Verma',
          specialization: 'Neurology',
          email: testDoctorEmail1, // collision with Dr. Neha Sharma
          phone: '9876543210',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return HTTP 404 when updating nonexistent doctor ID', async () => {
      const res = await request(app)
        .put('/api/doctors/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Missing',
          specialization: 'General',
          email: 'nonexistent@test.example.com',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 when PUT payload is incomplete (missing specialization)', async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Incomplete',
          email: testDoctorEmail2,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP 400 when updating with malformed ID', async () => {
      const res = await request(app)
        .put('/api/doctors/malformed-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Valid Name',
          specialization: 'Surgery',
          email: 'test@example.com',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthenticated update with HTTP 401', async () => {
      const res = await request(app)
        .put(`/api/doctors/${doctorToUpdateId}`)
        .send({
          name: 'Dr. Unauthenticated',
          specialization: 'Surgery',
          email: testDoctorEmail2,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('5. Delete Doctor (DELETE /api/doctors/:id)', () => {
    let doctorToDeleteId;

    beforeEach(async () => {
      // Create a dedicated doctor to delete
      const res = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Dr. Temp Delete',
          specialization: 'Temporary Care',
          email: `temp.delete.${Date.now()}@test.example.com`,
          phone: '9999999999',
        });
      doctorToDeleteId = res.body.data.id;
    });

    afterEach(async () => {
      if (doctorToDeleteId) {
        await db.query('DELETE FROM doctors WHERE id = $1;', [doctorToDeleteId]);
      }
    });

    it('should delete doctor with HTTP 204 No Content', async () => {
      await request(app)
        .delete(`/api/doctors/${doctorToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      // Verify subsequent GET returns 404
      const getRes = await request(app)
        .get(`/api/doctors/${doctorToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(getRes.body.success).toBe(false);
      doctorToDeleteId = null; // Avoid redundant cleanup
    });

    it('should support trailing slash route DELETE /api/doctors/:id/', async () => {
      await request(app)
        .delete(`/api/doctors/${doctorToDeleteId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      doctorToDeleteId = null;
    });

    it('should return HTTP 404 when deleting nonexistent doctor ID', async () => {
      const res = await request(app)
        .delete('/api/doctors/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 when attempting to delete with malformed ID', async () => {
      const res = await request(app)
        .delete('/api/doctors/invalid-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthenticated deletion with HTTP 401', async () => {
      const res = await request(app)
        .delete(`/api/doctors/${doctorToDeleteId}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should safely prevent deletion and return HTTP 409 if foreign key references exist', async () => {
      // Simulate foreign key constraint by creating a reference table that references doctors
      await db.query(`
        CREATE TABLE IF NOT EXISTS test_patient_doctor_mappings (
          id serial PRIMARY KEY,
          doctor_id integer NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT
        );
      `);

      try {
        // Insert a reference to doctorToDeleteId
        await db.query(
          'INSERT INTO test_patient_doctor_mappings (doctor_id) VALUES ($1);',
          [doctorToDeleteId]
        );

        // Attempt deletion should be caught and return 409
        const res = await request(app)
          .delete(`/api/doctors/${doctorToDeleteId}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(409);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('DELETE_CONFLICT');
      } finally {
        await db.query('DROP TABLE IF EXISTS test_patient_doctor_mappings;');
      }
    });
  });
});
