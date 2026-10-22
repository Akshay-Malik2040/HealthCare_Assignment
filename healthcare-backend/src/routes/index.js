const express = require('express');
const db = require('../config/db');
const authRoutes = require('../modules/auth/auth.routes');
const patientRoutes = require('../modules/patients/patient.routes');
const doctorRoutes = require('../modules/doctors/doctor.routes');
const mappingRoutes = require('../modules/mappings/mapping.routes');

const router = express.Router();

// Mount authentication module routes
router.use('/auth', authRoutes);

// Mount patient management module routes
router.use('/patients', patientRoutes);

// Mount doctor management module routes
router.use('/doctors', doctorRoutes);

// Mount patient-doctor mapping module routes
router.use('/mappings', mappingRoutes);

/**
 * GET /api
 * Root API metadata
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Healthcare Management Backend API',
      version: '1.0.0',
      phase: 'Phase 5 - Patient-Doctor Mapping APIs',
      status: 'operational',
      endpoints: {
        health: '/api/health',
        register: '/api/auth/register',
        login: '/api/auth/login',
        patients: '/api/patients',
        doctors: '/api/doctors',
        mappings: '/api/mappings',
      },
    },
  });
});

/**
 * GET /api/health
 * Health check endpoint
 * - Default: Readiness check verifying database connectivity
 * - Query ?check=liveness: Quick liveness check without probing database
 */
router.get('/health', async (req, res, next) => {
  try {
    const isLiveness = req.query.check === 'liveness';
    const timestamp = new Date().toISOString();
    const uptimeSeconds = Math.floor(process.uptime());

    if (isLiveness) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'UP',
          uptime: uptimeSeconds,
          timestamp,
          checks: {
            app: 'healthy',
          },
        },
      });
    }

    // Readiness check: probes database connection
    const dbStatus = await db.checkDbConnection();
    const isHealthy = dbStatus.ok;

    const responsePayload = {
      success: isHealthy,
      data: {
        status: isHealthy ? 'UP' : 'DOWN',
        uptime: uptimeSeconds,
        timestamp,
        checks: {
          app: 'healthy',
          database: {
            status: isHealthy ? 'connected' : 'disconnected',
            latencyMs: dbStatus.latencyMs,
            ...(dbStatus.error ? { error: dbStatus.error } : {}),
          },
        },
      },
    };

    const httpStatus = isHealthy ? 200 : 503;
    return res.status(httpStatus).json(responsePayload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
