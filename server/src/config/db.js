const path = require('path');
const fs = require('fs');

let initialized = false;
let db = null;
let auth = null;
let activeProjectId = '';

/**
 * Initializes firebase-admin strictly with Firebase credentials for real project.
 * Restricts emulator strictly to automated tests (NODE_ENV === 'test').
 * Exits with fatal error (process.exit(1)) if credentials missing or unreachable in normal runtime.
 */
function initFirebase() {
  if (initialized && db && auth) {
    return { db, auth, projectId: activeProjectId };
  }

  // 1. Automated Test Environment ONLY: isolated from real cloud project
  if (process.env.NODE_ENV === 'test') {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const admin = require('firebase-admin');
      const { getFirestore } = require('firebase-admin/firestore');
      const { getAuth } = require('firebase-admin/auth');

      const existingApps = admin.getApps();
      activeProjectId = process.env.FIREBASE_PROJECT_ID || 'lifelink-test-emulator';
      const app = existingApps.length ? existingApps[0] : admin.initializeApp({ projectId: activeProjectId });
      db = getFirestore(app);
      auth = getAuth(app);
      initialized = true;
      console.log(`[Firebase Test] Connected to Firestore Emulator (Project: ${activeProjectId})`);
      return { admin, db, auth, projectId: activeProjectId };
    }

    // Isolated test double engine for tests - tests cannot write to the real cloud project
    const { memoryFirestoreInstance, memoryAuthInstance } = require('../../tests/helpers/inMemoryFirestore');
    activeProjectId = 'lifelink-test-isolated';
    db = memoryFirestoreInstance;
    auth = memoryAuthInstance;
    initialized = true;
    return { admin: null, db, auth, projectId: activeProjectId };
  }

  // 2. Runtime (npm start / npm run dev / production):
  // Disallow emulator in runtime - must connect strictly to real Firebase cloud project
  const admin = require('firebase-admin');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getAuth } = require('firebase-admin/auth');

  const existingApps = admin.getApps();
  if (initialized && existingApps.length > 0) {
    return { admin, db, auth, projectId: activeProjectId };
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.error('========================================================================');
    console.error('❌ FATAL: Firebase credentials missing!');
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in environment variables.');
    console.error('All data must be stored in Firestore on the real Firebase project.');
    console.error('In-memory mode and silent fallbacks are disabled.');
    console.error('Please configure FIREBASE_SERVICE_ACCOUNT_PATH in server/.env pointing to');
    console.error('your Firebase service account JSON key file.');
    console.error('========================================================================');
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(serviceAccountPath)
    ? serviceAccountPath
    : path.resolve(process.cwd(), serviceAccountPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error('========================================================================');
    console.error(`❌ FATAL: Firebase service account file not found at: ${resolvedPath}`);
    console.error('Please verify that the file exists and FIREBASE_SERVICE_ACCOUNT_PATH is correct.');
    console.error('========================================================================');
    process.exit(1);
  }

  let serviceAccount;
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    console.error('========================================================================');
    console.error(`❌ FATAL: Failed to read/parse Firebase service account JSON: ${err.message}`);
    console.error('========================================================================');
    process.exit(1);
  }

  activeProjectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'lifelink-f6f3b';

  let app;
  if (!existingApps.length) {
    app = admin.initializeApp({
      credential: admin.cert(serviceAccount),
    });
  } else {
    app = existingApps[0];
  }

  db = getFirestore(app);
  auth = getAuth(app);
  initialized = true;

  console.log(`[Firebase] Connected to Firestore project: ${activeProjectId}`);
  return { admin, db, auth, projectId: activeProjectId };
}

/**
 * Connect to Firestore and verify reachability.
 * Exits with clear error if Firestore is unreachable.
 */
const connectDB = async () => {
  const result = initFirebase();
  if (process.env.NODE_ENV !== 'test') {
    try {
      // Fast probe to ensure Firestore cloud connection is live and reachable
      await result.db.collection('_health').limit(1).get();
    } catch (err) {
      console.error('========================================================================');
      console.error(`❌ FATAL: Firestore is unreachable or credentials unauthorized: ${err.message}`);
      console.error('Please check your Firebase connection and service account permissions.');
      console.error('========================================================================');
      process.exit(1);
    }
  }
  return result.db;
};

module.exports = connectDB;
module.exports.initFirebase = initFirebase;
module.exports.getDb = () => {
  if (!db) initFirebase();
  return db;
};
module.exports.getAuth = () => {
  if (!auth) initFirebase();
  return auth;
};
module.exports.getAdmin = () => {
  const admin = require('firebase-admin');
  return admin;
};
module.exports.getProjectId = () => activeProjectId;
