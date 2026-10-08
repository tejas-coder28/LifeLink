/**
 * app.js — Express application factory (no server binding).
 *
 * Import this file in tests to get a fully configured app instance
 * without triggering app.listen() or the auto-seed logic.
 * The entry-point (index.js) handles listen() and DB connection.
 */

const express = require('express');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimiter');

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
  const { getProjectId } = require('./config/db');
  res.status(200).json({
    success: true,
    status: 'operational',
    dbType: 'firestore',
    projectId: getProjectId() || process.env.FIREBASE_PROJECT_ID || 'lifelink',
    message: 'LifeLink API Gateway is operational',
    timestamp: new Date().toISOString(),
  });
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
