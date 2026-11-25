/**
 * Synchronizes all Mongoose schema indexes with MongoDB.
 * Usage: npm run indexes:sync (inside server/)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const { connectMongo, disconnectMongo } = require('../src/config/mongo');
const models = require('../src/models');

async function syncAllIndexes() {
  await connectMongo();
  const entries = Object.entries(models);
  console.log(`[MongoDB Indexes] Syncing indexes across ${entries.length} models...`);

  for (const [name, Model] of entries) {
    await Model.syncIndexes();
    const indexes = await Model.collection.indexes();
    console.log(`  - ${name} (${Model.collection.collectionName}): ${indexes.length} index(es) active`);
  }

  console.log('✅ All MongoDB indexes synchronized successfully.');
}

if (require.main === module) {
  syncAllIndexes()
    .then(async () => {
      await disconnectMongo();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to sync MongoDB indexes:', err.message);
      try { await disconnectMongo(); } catch (_) {}
      process.exit(1);
    });
}

module.exports = { syncAllIndexes };
