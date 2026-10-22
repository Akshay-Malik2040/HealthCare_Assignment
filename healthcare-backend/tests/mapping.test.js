const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Healthcare Management Backend - Phase 5 Patient-Doctor Mapping Tests', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;

  let patientA1Id;
  let patientA2Id;
  let patientBId;

  let doctor1Id;
  let doctor2Id;

  const userAEmail = 'usera.mapping@test.example.com';
  const userBEmail = 'userb.mapping@test.example.com';
  const userPassword = 'TestPassword123!';

  const doctor1Email = 'dr.mapping.one@test.example.com';
  const doctor2Email = 'dr.mapping.two@test.example.com';

  beforeAll(async () => {
    // 1. Clean up potential leftovers from previous test runs
    await db.query('DELETE FROM users WHERE email IN ($1, $2);', [userAEmail, userBEmail]);
    await db.query('DELETE FROM doctors WHERE email IN ($1, $2);', [doctor1Email, doctor2Email]);

    // 2. Register & Login User A
    const regARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Mapping Admin User A',
        email: userAEmail,
        password: userPassword,
      });
    userAId = regARes.body.data.id;

    const loginARes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userAEmail,
        password: userPassword,
      });
    userAToken = loginARes.body.data.token;

    // 3. Register & Login User B
    const regBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Mapping Admin User B',
        email: userBEmail,
        password: userPassword,
      });
    userBId = regBRes.body.data.id;

    const loginBRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userBEmail,
        password: userPassword,
      });
    userBToken = loginBRes.body.data.token;

    // 4. Create patients for User A
    const patA1Res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Patient UserA Alpha',
        age: 30,
        gender: 'male',
      });
    patientA1Id = patA1Res.body.data.id;

    const patA2Res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Patient UserA Beta',
        age: 45,
        gender: 'female',
      });
    patientA2Id = patA2Res.body.data.id;

    // 5. Create patient for User B
    const patBRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'Patient UserB Gamma',
        age: 60,
        gender: 'other',
      });
    patientBId = patBRes.body.data.id;

    // 6. Create shared doctors
    const doc1Res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Dr. Arjun Mehta',
        specialization: 'Cardiology',
        email: doctor1Email,
        phone: '+91-9876500001',
      });
    doctor1Id = doc1Res.body.data.id;

    const doc2Res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Dr. Sunita Rao',
        specialization: 'Neurology',
        email: doctor2Email,
        phone: '+91-9876500002',
      });
    doctor2Id = doc2Res.body.data.id;
  });

  afterAll(async () => {
    // Cascading clean up: deleting users removes patients and mappings
    await db.query('DELETE FROM users WHERE email IN ($1, $2);', [userAEmail, userBEmail]);
    await db.query('DELETE FROM doctors WHERE email IN ($1, $2);', [doctor1Email, doctor2Email]);
    await db.closeDb();
  });

  describe('1. Create Mapping (POST /api/mappings)', () => {
    let createdMappingId;

    it('should create a patient-doctor mapping successfully with valid data and HTTP 201', async () => {
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientA1Id,
          doctor_id: doctor1Id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.patient_id).toBe(patientA1Id);
      expect(res.body.data.doctor_id).toBe(doctor1Id);
      expect(res.body.data).toHaveProperty('created_at');
      createdMappingId = res.body.data.id;
    });

    it('should support trailing slash route POST /api/mappings/', async () => {
      const res = await request(app)
        .post('/api/mappings/')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientA1Id,
          doctor_id: doctor2Id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(patientA1Id);
      expect(res.body.data.doctor_id).toBe(doctor2Id);
    });

    it('should reject unauthenticated mapping creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/mappings')
        .send({
          patient_id: patientA1Id,
          doctor_id: doctor1Id,
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return HTTP 404 when assigning a doctor to a nonexistent patient', async () => {
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: 999999,
          doctor_id: doctor1Id,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it("should return HTTP 404 when attempting to assign a doctor to another user's patient", async () => {
      // User A attempts to assign a doctor to User B's patient (patientBId)
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientBId,
          doctor_id: doctor1Id,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 404 when assigning to a nonexistent doctor', async () => {
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientA1Id,
          doctor_id: 999999,
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 409 Conflict when creating a duplicate assignment', async () => {
      // (patientA1Id, doctor1Id) was already assigned in the first test
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientA1Id,
          doctor_id: doctor1Id,
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_MAPPING');
    });

    it('should prevent client input from overriding mapping id or timestamps', async () => {
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          id: 88888,
          patient_id: patientBId,
          doctor_id: doctor1Id,
          created_at: '2020-01-01T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(88888);
      expect(new Date(res.body.data.created_at).getFullYear()).toBeGreaterThan(2020);
    });

    describe('Creation Validation Errors (HTTP 400)', () => {
      it('should reject missing patient_id', async () => {
        const res = await request(app)
          .post('/api/mappings')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            doctor_id: doctor1Id,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing doctor_id', async () => {
        const res = await request(app)
          .post('/api/mappings')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            patient_id: patientA1Id,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject string IDs in body', async () => {
        const res = await request(app)
          .post('/api/mappings')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            patient_id: 'not-a-number',
            doctor_id: doctor1Id,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject negative IDs in body', async () => {
        const res = await request(app)
          .post('/api/mappings')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            patient_id: -1,
            doctor_id: doctor1Id,
          })
          .expect(400);

        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('2. List Mappings (GET /api/mappings)', () => {
    it('should return mappings associated ONLY with patients owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify all returned mappings belong only to User A's patients
      res.body.data.forEach((mapping) => {
        expect([patientA1Id, patientA2Id]).toContain(mapping.patient_id);
        expect(mapping.patient_id).not.toBe(patientBId);
        expect(mapping).toHaveProperty('id');
        expect(mapping).toHaveProperty('patient_name');
        expect(mapping).toHaveProperty('doctor_name');
        expect(mapping).toHaveProperty('doctor_specialization');
      });
    });

    it('should allow User B to only see mappings for User B patients', async () => {
      const res = await request(app)
        .get('/api/mappings')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].patient_id).toBe(patientBId);
    });

    it('should return an empty array if the user has no mappings', async () => {
      // Register new User C with no patients or mappings
      const regCRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User C No Mappings',
          email: 'userc.empty@test.example.com',
          password: userPassword,
        });

      const loginCRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'userc.empty@test.example.com',
          password: userPassword,
        });

      try {
        const res = await request(app)
          .get('/api/mappings')
          .set('Authorization', `Bearer ${loginCRes.body.data.token}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual([]);
      } finally {
        await db.query('DELETE FROM users WHERE email = $1;', ['userc.empty@test.example.com']);
      }
    });

    it('should support trailing slash route GET /api/mappings/', async () => {
      const res = await request(app)
        .get('/api/mappings/')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject unauthenticated list request with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/mappings')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Get Doctors Assigned to a Patient (GET /api/mappings/:patient_id)', () => {
    it('should retrieve doctors assigned to an owned patient with HTTP 200', async () => {
      const res = await request(app)
        .get(`/api/mappings/${patientA1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      const doctorIds = res.body.data.map((d) => d.doctor_id);
      expect(doctorIds).toContain(doctor1Id);
      expect(doctorIds).toContain(doctor2Id);

      // Verify mapping metadata is included
      expect(res.body.data[0]).toHaveProperty('mapping_id');
      expect(res.body.data[0]).toHaveProperty('doctor_name');
      expect(res.body.data[0]).toHaveProperty('specialization');
      expect(res.body.data[0]).toHaveProperty('assigned_at');
    });

    it('should support trailing slash route GET /api/mappings/:patient_id/', async () => {
      const res = await request(app)
        .get(`/api/mappings/${patientA1Id}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return HTTP 200 with an empty array if the owned patient has no assignments', async () => {
      // patientA2Id has no doctor assignments yet
      const res = await request(app)
        .get(`/api/mappings/${patientA2Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should return HTTP 404 when attempting to retrieve mappings for another user's patient", async () => {
      // User A tries to view mappings for User B's patient (patientBId)
      const res = await request(app)
        .get(`/api/mappings/${patientBId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 404 for nonexistent patient ID', async () => {
      const res = await request(app)
        .get('/api/mappings/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 for malformed patient ID string', async () => {
      const res = await request(app)
        .get('/api/mappings/invalid-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return HTTP 400 for negative or zero patient ID', async () => {
      await request(app)
        .get('/api/mappings/-10')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      await request(app)
        .get('/api/mappings/0')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);
    });

    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await request(app)
        .get(`/api/mappings/${patientA1Id}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('4. Delete Mapping (DELETE /api/mappings/:id)', () => {
    let mappingToDeleteId;

    beforeEach(async () => {
      // Create a dedicated mapping on patientA2Id for deletion tests
      const res = await request(app)
        .post('/api/mappings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          patient_id: patientA2Id,
          doctor_id: doctor1Id,
        });
      mappingToDeleteId = res.body.data.id;
    });

    afterEach(async () => {
      if (mappingToDeleteId) {
        await db.query('DELETE FROM patient_doctors WHERE id = $1;', [mappingToDeleteId]);
      }
    });

    it("should return HTTP 404 when User B attempts to delete User A's mapping", async () => {
      const res = await request(app)
        .delete(`/api/mappings/${mappingToDeleteId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should delete owned mapping with HTTP 204 No Content', async () => {
      await request(app)
        .delete(`/api/mappings/${mappingToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      // Verify mapping is gone
      const verifyRes = await request(app)
        .get(`/api/mappings/${patientA2Id}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.body.data).toEqual([]);

      mappingToDeleteId = null;
    });

    it('should support trailing slash route DELETE /api/mappings/:id/', async () => {
      await request(app)
        .delete(`/api/mappings/${mappingToDeleteId}/`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      mappingToDeleteId = null;
    });

    it('should return HTTP 404 when deleting a nonexistent mapping ID', async () => {
      const res = await request(app)
        .delete('/api/mappings/999999')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return HTTP 400 for malformed mapping ID', async () => {
      const res = await request(app)
        .delete('/api/mappings/not-a-valid-id')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthenticated deletion request with HTTP 401', async () => {
      const res = await request(app)
        .delete(`/api/mappings/${mappingToDeleteId}`)
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should verify that deleting a mapping does NOT delete the patient or doctor record', async () => {
      await request(app)
        .delete(`/api/mappings/${mappingToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      mappingToDeleteId = null;

      // 1. Verify patient still exists
      const patientCheck = await request(app)
        .get(`/api/patients/${patientA2Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(patientCheck.body.data.id).toBe(patientA2Id);

      // 2. Verify doctor still exists
      const doctorCheck = await request(app)
        .get(`/api/doctors/${doctor1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(doctorCheck.body.data.id).toBe(doctor1Id);
    });
  });
});
