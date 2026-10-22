const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers with Helmet
app.use(helmet());

// Conservative CORS policy driven by environment variables
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (tools, Supertest, curl, server-to-server) where origin is undefined
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS policy.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Express JSON body parser with strict size limit to guard against large payloads
app.use(express.json({ limit: '10kb' }));

// Mount API routes under /api
app.use('/api', routes);

// Base index route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Healthcare Management API (Phase 1)',
    apiDocumentation: '/api',
    healthCheck: '/api/health',
  });
});

// Catch-all 404 handler for unknown routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
