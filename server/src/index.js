require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./repositories/user.repository');
const seedData = require('./seed');
const app = require('./app');
const { runIndexSelfCheck } = require('./utils/indexChecker');

// Process stability: global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('========================================================================');
  console.error('❌ FATAL: Unhandled Promise Rejection detected:');
  if (reason instanceof Error) {
    console.error(reason.stack || reason.message);
    if (reason.message && (reason.message.includes('FAILED_PRECONDITION') || reason.message.includes('requires an index'))) {
      const linkMatch = reason.message.match(/https:\/\/[^\s]+/);
      console.error('Missing Firestore Composite Index detected!');
      if (linkMatch) {
        console.error(`Firebase Console Index URL: ${linkMatch[0]}`);
      }
    }
  } else {
    console.error(reason);
  }
  console.error('========================================================================');
  process.exit(1);
});

// Process stability: global uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('========================================================================');
  console.error('❌ FATAL: Uncaught Exception detected:');
  console.error(err.stack || err.message);
  if (err.message && (err.message.includes('FAILED_PRECONDITION') || err.message.includes('requires an index'))) {
    const linkMatch = err.message.match(/https:\/\/[^\s]+/);
    console.error('Missing Firestore Composite Index detected!');
    if (linkMatch) {
      console.error(`Firebase Console Index URL: ${linkMatch[0]}`);
    }
  }
  console.error('========================================================================');
  process.exit(1);
});

// Connect to Firestore Database and auto-seed if empty in non-production local development
connectDB().then(async (db) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('Database is empty. Auto-seeding initial demo data for local dev...');
        await seedData(false);
      }
    }

    // Safe migration: ensure any existing requests lacking targetHospital are handled
    const BloodRequest = require('./repositories/bloodRequest.repository');
    const legacyRequests = await BloodRequest.find({ targetHospital: null });
    if (legacyRequests.length > 0) {
      for (const req of legacyRequests) {
        if (req.hospital) {
          req.targetHospital = req.hospital;
        } else {
          req.status = 'legacy';
        }
        await req.save();
      }
      console.log(`[Safe Migration] Updated ${legacyRequests.length} legacy requests with targetHospital / legacy status`);
    }

    // Dev-only startup self-check that runs each indexed query once with limit(1)
    await runIndexSelfCheck(db);
  } catch (err) {
    console.error('Startup check error:', err.message);
  }
}).catch((err) => {
  console.error('Failed to initialize database:', err.message);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 LifeLink API Gateway & Services Running on Port ${PORT}`);
  console.log(`  Core Loop: Request → Match → Respond → Donate → AI`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('========================================================================');
    console.error(`❌ FATAL: Port ${PORT} is already in use (EADDRINUSE).`);
    console.error(`Another process is already listening on port ${PORT}.`);
    console.error(`Please terminate the existing process or use a different PORT.`);
    console.error('========================================================================');
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
});

module.exports = { app, server };
