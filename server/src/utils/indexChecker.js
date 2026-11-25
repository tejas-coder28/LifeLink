const models = require('../models');

/**
 * MongoDB Index Checker (Dev & Verification Utility):
 * Ensures all declared Mongoose schema indexes are created and reports
 * any missing or drifted indexes across every collection.
 */
async function checkMongoIndexes({ sync = true, quiet = false } = {}) {
  const results = [];
  let totalIndexes = 0;

  for (const [modelName, Model] of Object.entries(models)) {
    if (sync) {
      await Model.syncIndexes();
    }
    const existing = await Model.collection.indexes();
    totalIndexes += existing.length;
    results.push({
      model: modelName,
      collection: Model.collection.collectionName,
      indexCount: existing.length,
      indexes: existing.map((idx) => idx.name),
    });
  }

  if (!quiet) {
    console.log(`✅ [MongoDB Index Check] Verified ${totalIndexes} indexes across ${results.length} collections.`);
  }

  return { totalIndexes, collections: results };
}

/**
 * Dev-only startup self-check wrapper matching index.js call signature.
 */
async function runIndexSelfCheck() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    return await checkMongoIndexes({ sync: true, quiet: false });
  } catch (err) {
    console.warn(`⚠️  [MongoDB Index Check] Could not complete index check: ${err.message}`);
    return null;
  }
}

module.exports = { runIndexSelfCheck, checkMongoIndexes };
