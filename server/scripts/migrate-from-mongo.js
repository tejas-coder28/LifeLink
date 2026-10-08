/**
 * server/scripts/migrate-from-mongo.js
 *
 * Migration script to migrate all collections from MongoDB to Firebase Firestore.
 *
 * RULES & SAFETY:
 * 1. Default mode is DRY RUN (inspects MongoDB, reports counts, changes nothing).
 * 2. Writes to Firestore ONLY when executed with the --confirm flag:
 *    node scripts/migrate-from-mongo.js --confirm
 * 3. STRICTLY READ-ONLY on MongoDB (never modifies, drops, or alters Mongo collections).
 * 4. Preserves original _id strings, references, nested structures, and timestamps.
 * 5. Batches writes into chunks of 450 (well under Firestore's 500 operations per batch limit).
 */

require('dotenv').config();

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  // Handled inside runMigration
}

const { initFirebase, getDb } = require('../src/config/db');

// Collection mapping: [Mongo collection name, Firestore collection name]
const COLLECTIONS = [
  { mongo: 'users', firestore: 'users' },
  { mongo: 'hospitals', firestore: 'hospitals' },
  { mongo: 'donorprofiles', firestore: 'donorProfiles' },
  { mongo: 'bloodrequests', firestore: 'bloodRequests' },
  { mongo: 'donations', firestore: 'donations' },
  { mongo: 'inventorytransactions', firestore: 'inventoryTransactions' },
  { mongo: 'donorrequestpings', firestore: 'donorRequestPings' },
  { mongo: 'notifications', firestore: 'notifications' },
  { mongo: 'aiinsights', firestore: 'aiInsights' },
  { mongo: 'loginlogs', firestore: 'loginLogs' },
];

/**
 * Recursively converts MongoDB BSON types (ObjectId, Date) into plain JS values
 * suitable for Firestore.
 */
function sanitizeForFirestore(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof mongoose.Types.ObjectId) return val.toString();
  if (val instanceof Date) return val;
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object') {
    // If it's a BSON object with toHexString or toString
    if (val._bsontype === 'ObjectID' || (val._id && typeof val._id === 'object' && val._id._bsontype === 'ObjectID')) {
      return val.toString();
    }
    const sanitized = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === '__v') continue; // omit Mongoose version key
      sanitized[k] = sanitizeForFirestore(v);
    }
    return sanitized;
  }
  return val;
}

async function runMigration() {
  const isConfirm = process.argv.includes('--confirm');

  console.log('========================================================================');
  console.log('       LifeLink MongoDB -> Firebase Firestore Migration Tool            ');
  console.log('========================================================================');
  console.log(`MODE: ${isConfirm ? '🔴 LIVE WRITE (--confirm specified)' : '🟡 DRY RUN (default, read-only)'}`);
  console.log('------------------------------------------------------------------------');

  if (!mongoose) {
    console.error('❌ Mongoose is required to read from MongoDB for migration.');
    console.error('Please run: npm install mongoose (or install temporarily for migration).');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelink';
  console.log(`[Mongo] Connecting to MongoDB: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('[Mongo] Connected successfully.');
  } catch (err) {
    console.error(`[Mongo] Failed to connect: ${err.message}`);
    process.exit(1);
  }

  // Initialize Firebase (required for live migration, optional for dry-run inspection)
  let firestore = null;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIRESTORE_EMULATOR_HOST) {
    if (isConfirm) {
      console.error('[Firestore] Failed: FIREBASE_SERVICE_ACCOUNT_PATH must be set for live migration.');
      await mongoose.disconnect();
      process.exit(1);
    } else {
      console.log('[Firestore] Notice: Firebase credentials not set; dry-run will inspect MongoDB only.');
    }
  } else {
    try {
      const fb = initFirebase();
      firestore = fb.db;
      console.log(`[Firestore] Initialized Firestore project: ${fb.projectId}`);
    } catch (err) {
      if (isConfirm) {
        console.error(`[Firestore] Failed to initialize Firebase: ${err.message}`);
        await mongoose.disconnect();
        process.exit(1);
      } else {
        console.log(`[Firestore] Notice: Firebase initialization skipped for dry run.`);
      }
    }
  }

  const mongoDb = mongoose.connection.db;
  const existingMongoCollections = (await mongoDb.listCollections().toArray()).map(c => c.name);

  console.log('\nScanning collections...\n');

  let totalDocsFound = 0;
  let totalDocsMigrated = 0;

  for (const { mongo, firestore: fsCol } of COLLECTIONS) {
    if (!existingMongoCollections.includes(mongo)) {
      console.log(`  - [${mongo}] Not found in MongoDB. Skipping.`);
      continue;
    }

    const collection = mongoDb.collection(mongo);
    const count = await collection.countDocuments();
    totalDocsFound += count;

    console.log(`  * [${mongo}] Found ${count} document(s) -> targets Firestore [${fsCol}]`);

    if (count === 0) continue;

    if (!isConfirm) {
      // Dry run inspection of a sample document
      const sample = await collection.findOne({});
      const sanitizedSample = sanitizeForFirestore(sample);
      console.log(`    ↳ Dry run sample doc ID: ${sanitizedSample._id}`);
      continue;
    }

    // Live migration with chunked batch writes
    const cursor = collection.find({});
    let batch = firestore.batch();
    let batchCount = 0;
    let colMigrated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const sanitized = sanitizeForFirestore(doc);
      const docId = sanitized._id.toString();

      // For users collection, also populate emails unique index collection
      if (fsCol === 'users' && sanitized.email) {
        const normalizedEmail = sanitized.email.trim().toLowerCase();
        const emailRef = firestore.collection('emails').doc(normalizedEmail);
        batch.set(emailRef, {
          userId: docId,
          createdAt: sanitized.createdAt || new Date(),
        }, { merge: true });
        batchCount++;
      }

      const docRef = firestore.collection(fsCol).doc(docId);
      const dataPayload = { ...sanitized };
      delete dataPayload._id; // Firestore stores ID as document key

      batch.set(docRef, dataPayload, { merge: true });
      batchCount++;
      colMigrated++;

      // Commit in chunks of 450 operations (Firestore limit is 500)
      if (batchCount >= 450) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    totalDocsMigrated += colMigrated;
    console.log(`    ✓ Migrated ${colMigrated} document(s) to [${fsCol}]`);
  }

  console.log('\n========================================================================');
  if (isConfirm) {
    console.log(`🎉 Migration COMPLETE! Total migrated: ${totalDocsMigrated} document(s) across all collections.`);
  } else {
    console.log(`ℹ️ DRY RUN COMPLETE. Total documents detected: ${totalDocsFound}.`);
    console.log('To execute the real migration and write to Firestore, run with:');
    console.log('   node scripts/migrate-from-mongo.js --confirm');
  }
  console.log('========================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch(async (err) => {
  console.error('Fatal error during migration:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
