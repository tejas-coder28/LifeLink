const path = require('path');
const fs = require('fs');

let initialized = false;
let db = null;
let auth = null;
let activeProjectId = '';

/**
 * Initializes firebase-admin with service account credentials or emulator.
 * Fails fast and exits loudly if credentials are missing in normal runtime.
 */
function initFirebase() {
  // 1. In-memory Firestore engine for tests or local offline dev without a Firebase service account
  if ((process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true') && !process.env.USE_REAL_EMULATOR) {
    if (initialized && db && auth) {
      return { admin: null, db, auth, projectId: activeProjectId };
    }
    const { memoryFirestoreInstance, memoryAuthInstance } = require('./inMemoryFirestore');
    activeProjectId = 'lifelink-in-memory';
    db = memoryFirestoreInstance;
    auth = memoryAuthInstance;
    initialized = true;
    console.log('[Firebase] Running in-memory database mode (active)');
    return { admin: null, db, auth, projectId: activeProjectId };
  }

  const admin = require('firebase-admin');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getAuth } = require('firebase-admin/auth');

  const existingApps = admin.getApps();
  if (initialized && existingApps.length > 0) {
    return { admin, db, auth, projectId: activeProjectId };
  }

  // 2. Real Firestore Emulator support
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    activeProjectId = process.env.FIREBASE_PROJECT_ID || 'lifelink-emulator';
    let app;
    if (!existingApps.length) {
      app = admin.initializeApp({
        projectId: activeProjectId,
      });
    } else {
      app = existingApps[0];
    }
    db = getFirestore(app);
    auth = getAuth(app);
    initialized = true;
    console.log(`[Firebase] Connected to Firestore Emulator (Project: ${activeProjectId})`);
    return { admin, db, auth, projectId: activeProjectId };
  }

  // 2. Production / Dev runtime: require FIREBASE_SERVICE_ACCOUNT_PATH
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.error('========================================================================');
    console.error('❌ FATAL: Firebase credentials missing!');
    console.error('FIREBASE_SERVICE_ACCOUNT_PATH is not set in environment variables.');
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
    console.error(`❌ FATAL: Failed to read/parse Firebase service account JSON: ${err.message}`);
    process.exit(1);
  }

  activeProjectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'unknown-project';

  let app;
  if (!existingApps.length) {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    app = existingApps[0];
  }

  db = getFirestore(app);
  auth = getAuth(app);
  initialized = true;

  // Startup banner shows project ID only (no secrets)
  console.log(`[Firebase] Connected to Firestore project: ${activeProjectId}`);

  return { admin, db, auth, projectId: activeProjectId };
}

const connectDB = async () => {
  const result = initFirebase();
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
module.exports.getAdmin = () => admin;
module.exports.getProjectId = () => activeProjectId;
