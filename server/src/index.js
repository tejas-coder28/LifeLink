require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const seedData = require('./seed');
const app = require('./app');

// Connect to MongoDB Database and auto-seed if empty in non-production local development
connectDB().then(async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('Database is empty. Auto-seeding initial demo data for local dev...');
        await seedData(false);
      }
    }
  } catch (err) {
    console.error('Auto-seed check error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🚀 LifeLink API Gateway & Services Running on Port ${PORT}`);
  console.log(`  Core Loop: Request → Match → Respond → Donate → AI`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
