/**
 * app.js — Express application factory (no server binding).
 *
 * Import this file in tests to get a fully configured app instance
 * without triggering app.listen() or the auto-seed logic.
 * The entry-point (index.js) handles listen() and DB connection.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimiter');
const { isMongoConnected, getDbName, getProjectId } = require('./config/db');
const { isDbError } = require('./utils/responseHandler');

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true,
}));

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const connected = isMongoConnected();
  if (!connected) {
    return res.status(503).json({
      success: false,
      status: 'disconnected',
      dbType: 'mongodb',
      dbName: getDbName(),
      projectId: getProjectId() || process.env.FIREBASE_PROJECT_ID || '',
      message: 'MongoDB database is currently unreachable.',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    status: 'connected',
    dbType: 'mongodb',
    dbName: getDbName(),
    projectId: getProjectId() || process.env.FIREBASE_PROJECT_ID || '',
    message: 'LifeLink API Gateway is operational and connected to MongoDB',
    timestamp: new Date().toISOString(),
  });
});

// Fail fast with clear 503 if MongoDB is unreachable instead of returning empty lists
app.use('/api', (req, res, next) => {
  if (!isMongoConnected()) {
    return res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database service is temporarily unavailable. Please verify MongoDB connectivity and try again.',
    });
  }
  return next();
});

// Domain Service Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/donors', require('./routes/donor.routes'));
app.use('/api/hospitals', require('./routes/hospital.routes'));
app.use('/api/requests', require('./routes/request.routes'));
app.use('/api/pings', require('./routes/ping.routes'));
app.use('/api/donations', require('./routes/donation.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/ai', require('./routes/ai.routes'));

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// Central Global Error Handler
app.use((err, req, res, next) => {
  const dbUnavailable = isDbError(err);
  if (dbUnavailable) {
    console.error(`❌ [Database Unavailable] [${req.method} ${req.originalUrl}]: ${err.message}`);
    return res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database service is temporarily unavailable. Please verify MongoDB connectivity and try again.',
    });
  }

  console.error(`Unhandled Server Error [${req.method} ${req.originalUrl}]:`, err);
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
