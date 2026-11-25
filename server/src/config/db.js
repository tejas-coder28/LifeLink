const path = require('path');
const fs = require('fs');
const { connectMongo, disconnectMongo, isMongoConnected, getDbName } = require('./mongo');

let authInitialized = false;
let auth = null;
let activeProjectId = '';

/**
 * Validates that client and server Firebase project IDs align without logging any secrets.
 */
function checkClientProjectId(projectId) {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../../../client/.env'),
      path.resolve(__dirname, '../../../client/.env.example'),
      path.resolve(process.cwd(), '../client/.env'),
      path.resolve(process.cwd(), '../client/.env.example'),
      path.resolve(process.cwd(), 'client/.env'),
      path.resolve(process.cwd(), 'client/.env.example'),
    ];
    let clientProjectId = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        const match = content.match(/VITE_FIREBASE_PROJECT_ID\s*=\s*([^\r\n#]+)/);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (val && !val.includes('your_project_id')) {
            clientProjectId = val;
            break;
          }
        }
      }
    }

    if (clientProjectId && projectId && clientProjectId !== projectId) {
      console.warn(`⚠️  [Firebase Auth Warning] Client project (${clientProjectId}) does not match server project (${projectId}). Google Sign-In will fail if projects differ.`);
    }
  } catch (_) {
    // Non-blocking diagnostic
  }
}

/**
 * Initializes firebase-admin strictly for Google Sign-In (ID token verification).
 * Firestore initialization is completely removed; all application data lives in MongoDB.
 */
function initFirebaseAuth() {
  if (authInitialized && auth) {
    return { auth, projectId: activeProjectId };
  }

  if (process.env.NODE_ENV === 'test') {
    const { memoryAuthInstance } = require('../../tests/helpers/firebaseAuthMock');
    activeProjectId = 'lifelink-test-isolated';
    auth = memoryAuthInstance;
    authInitialized = true;
    return { admin: null, auth, projectId: activeProjectId };
  }

  const admin = require('firebase-admin');
  const { getAuth } = require('firebase-admin/auth');

  const existingApps = admin.getApps();
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    activeProjectId = process.env.FIREBASE_PROJECT_ID || '';
    if (activeProjectId && !existingApps.length) {
      const app = admin.initializeApp({ projectId: activeProjectId });
      auth = getAuth(app);
      authInitialized = true;
      checkClientProjectId(activeProjectId);
      return { admin, auth, projectId: activeProjectId };
    }
    if (existingApps.length > 0) {
      auth = getAuth(existingApps[0]);
      authInitialized = true;
      return { admin, auth, projectId: activeProjectId };
    }
    console.warn('⚠️  [Firebase Auth] FIREBASE_SERVICE_ACCOUNT_PATH not configured. Google Sign-In ID token verification will reject tokens until configured.');
    auth = {
      verifyIdToken: async () => {
        const err = new Error('Google Sign-In is not configured on the server.');
        err.statusCode = 503;
        throw err;
      },
    };
    authInitialized = true;
    return { admin, auth, projectId: activeProjectId };
  }

  const candidatePaths = [
    path.isAbsolute(serviceAccountPath) ? serviceAccountPath : path.resolve(process.cwd(), serviceAccountPath),
    path.resolve(__dirname, '../../', serviceAccountPath),
    path.resolve(__dirname, '../', serviceAccountPath),
  ];
  const resolvedPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];

  if (!fs.existsSync(resolvedPath)) {
    console.warn(`⚠️  [Firebase Auth] Service account file not found at ${resolvedPath}. Google Sign-In disabled until path is valid.`);
    activeProjectId = process.env.FIREBASE_PROJECT_ID || '';
    auth = {
      verifyIdToken: async () => {
        const err = new Error('Google Sign-In credentials missing on server.');
        err.statusCode = 503;
        throw err;
      },
    };
    authInitialized = true;
    return { admin, auth, projectId: activeProjectId };
  }

  let serviceAccount;
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ [Firebase Auth] Failed to parse service account JSON: ${err.message}`);
    throw err;
  }

  activeProjectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || '';

  const app = existingApps.length
    ? existingApps[0]
    : admin.initializeApp({
        credential: admin.cert(serviceAccount),
      });

  auth = getAuth(app);
  authInitialized = true;

  if (activeProjectId) {
    checkClientProjectId(activeProjectId);
  }

  return { admin, auth, projectId: activeProjectId };
}

/**
 * Primary database connection entry point (MongoDB) + Firebase Auth setup.
 */
const connectDB = async (uriOverride = null, options = {}) => {
  initFirebaseAuth();
  return await connectMongo(uriOverride, options);
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.connectMongo = connectMongo;
module.exports.disconnectMongo = disconnectMongo;
module.exports.isMongoConnected = isMongoConnected;
module.exports.getDbName = getDbName;
module.exports.initFirebaseAuth = initFirebaseAuth;
module.exports.initFirebase = initFirebaseAuth;
module.exports.getAuth = () => {
  if (!auth) initFirebaseAuth();
  return auth;
};
module.exports.getAdmin = () => require('firebase-admin');
module.exports.getProjectId = () => activeProjectId;
