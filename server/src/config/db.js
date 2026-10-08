const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

let initialized = false;
let db = null;
let auth = null;
let activeProjectId = '';

/**
 * Initializes firebase-admin with service account credentials or emulator.
 * Fails fast and exits loudly if credentials are missing in normal runtime.
 */
function initFirebase() {
  if (initialized && admin.apps.length > 0) {
    return { admin, db, auth, projectId: activeProjectId };
  }

  // 1. Emulator / Test environment support
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.NODE_ENV === 'test') {
    if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV === 'test') {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    }
    activeProjectId = process.env.FIREBASE_PROJECT_ID || 'lifelink-emulator';
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: activeProjectId,
      });
    }
    db = admin.firestore();
    auth = admin.auth();
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

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
  auth = admin.auth();
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
