/**
 * Isolated Firebase Auth mock for automated Jest tests (NODE_ENV === 'test').
 * Used ONLY to simulate Firebase Google ID Token verification without touching real Firebase services.
 */
class MockFirebaseAuth {
  async verifyIdToken(idToken) {
    if (idToken === 'mock_mismatched_project_token') {
      return {
        uid: 'google_mock_foreign_uid',
        email: 'foreign_project@gmail.com',
        email_verified: true,
        name: 'Foreign Project User',
        aud: 'mismatched-cloud-project',
        firebase: { project_id: 'mismatched-cloud-project' },
      };
    }
    if (idToken === 'mock_unverified_email_token') {
      return {
        uid: 'google_mock_unverified_uid',
        email: 'unverified_email@gmail.com',
        email_verified: false,
        name: 'Unverified Email User',
        aud: 'lifelink-test-isolated',
        firebase: { project_id: 'lifelink-test-isolated' },
      };
    }
    if (idToken === 'mock_google_id_token' || (typeof idToken === 'string' && idToken.startsWith('mock_'))) {
      return {
        uid: 'google_mock_uid_123',
        email: 'mock_google_user@gmail.com',
        email_verified: true,
        name: 'Mock Google User',
        aud: 'lifelink-test-isolated',
        firebase: { project_id: 'lifelink-test-isolated' },
      };
    }
    try {
      const parts = String(idToken).split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.email) {
          return {
            uid: payload.sub || payload.uid || 'google_user_uid',
            email: payload.email,
            email_verified: payload.email_verified !== false,
            name: payload.name || payload.email.split('@')[0],
            aud: payload.aud || 'lifelink-test-isolated',
            firebase: { project_id: payload.project_id || payload.aud || 'lifelink-test-isolated' },
          };
        }
      }
    } catch (_) {
      // Fall through to invalid token error
    }
    const err = new Error('Invalid or expired Google authentication token');
    err.code = 'auth/argument-error';
    throw err;
  }
}

const memoryAuthInstance = new MockFirebaseAuth();

module.exports = {
  MockFirebaseAuth,
  memoryAuthInstance,
};
