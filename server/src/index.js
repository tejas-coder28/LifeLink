const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./repositories/user.repository');
const seedData = require('./seed');
const app = require('./app');
const { runIndexSelfCheck } = require('./utils/indexChecker');
const { logStartupProvider } = require('./services/geminiService');

// Process stability: global unhandled promise rejection handler
process.on('unhandledRejection', (reason) => {
  console.error('========================================================================');
  console.error('❌ FATAL: Unhandled Promise Rejection detected:');
  if (reason instanceof Error) {
    console.error(reason.stack || reason.message);
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
  console.error('========================================================================');
  process.exit(1);
});

// Connect to MongoDB and auto-seed if empty in non-production local development
connectDB()
  .then(async () => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          console.log('Database is empty. Auto-seeding initial demo data for local dev...');
          await seedData({ shouldExit: false });
        }
      }

      // Verify / sync MongoDB indexes in local development
      await runIndexSelfCheck();
    } catch (err) {
      console.error('Startup check error:', err.message);
    }
  })
  .catch((err) => {
    console.error('Failed to initialize MongoDB:', err.message);
  });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 LifeLink API Gateway & Services Running on Port ${PORT}`);
  console.log(`  Core Loop: Request → Match → Respond → Donate → AI`);
  console.log(`=======================================================`);
  logStartupProvider();
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
