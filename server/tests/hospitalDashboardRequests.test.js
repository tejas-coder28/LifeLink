/**
 * server/tests/hospitalDashboardRequests.test.js
 *
 * Tests for Hospital Dashboard request synchronization and classification:
 * 1. Hospital creates a request for itself: appears in Active Requests, does NOT appear in Incoming Demands, tab badge = 1.
 * 2. Another hospital logs in: request does NOT appear in their dashboard (Active or Incoming).
 * 3. Patient creates request addressed to Hospital A: appears in Hospital A's Incoming Demands, not Active Requests.
 * 4. Hospital A accepts patient request: moves from Incoming Demands to Active Requests.
 * 5. Seeded request (Kaneesh, B+) appears in City General's Active Requests.
 * 6. Tab badge counts equal list lengths and equal AI tool counts.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');

let app;
let BloodRequest;
let Hospital;
let User;
let hospitalAiTools;
let hospitalRequestRules;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  Hospital = require('../src/repositories/hospital.repository');
  User = require('../src/repositories/user.repository');
  hospitalAiTools = require('../src/services/aiTools/hospitalTools');
  hospitalRequestRules = require('../src/services/hospitalRequestRules');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

const createVerifiedHospital = async (name, email) => {
  const reg = await registerHospital(app, { name, email });
  const userId = reg.user?._id || reg.user?.id || reg.user?.user?._id || reg.user?.user?.id;
  const hospital = await Hospital.findOne({ user: userId });
  hospital.isVerified = true;
  await hospital.save();
  return { token: reg.token, hospital, userId };
};

describe('Hospital Dashboard Requests & Shared Rules Isolation', () => {
  test('Hospital creates a request for itself: appears in Active Requests, NOT in Incoming Demands, badge count = 1', async () => {
    const hospA = await createVerifiedHospital('City General Emergency Hospital', 'citygen@lifelink.com');

    // Hospital creates a replenishment request for itself
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${hospA.token}`)
      .send({
        patientName: 'Sharma',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'critical',
        hospitalId: hospA.hospital._id,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe('open');

    // 1. Fetch Active Requests (/api/requests/my)
    const activeRes = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.success).toBe(true);
    expect(activeRes.body.data.length).toBe(1);
    expect(activeRes.body.data[0].patientName).toBe('Sharma');
    expect(activeRes.body.data[0].status).toBe('open');

    // 2. Fetch Incoming Demands (/api/requests/hospital/incoming)
    const incomingRes = await request(app)
      .get('/api/requests/hospital/incoming')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(incomingRes.status).toBe(200);
    expect(incomingRes.body.success).toBe(true);
    expect(incomingRes.body.data.length).toBe(0); // must NEVER appear in incoming demands

    // 3. Shared bundle rule verification
    const bundle = await hospitalRequestRules.getHospitalRequestsBundle(hospA.hospital);
    expect(bundle.activeCount).toBe(1);
    expect(bundle.incomingCount).toBe(0);
    expect(bundle.activeRequests[0].patientName).toBe('Sharma');

    // 4. AI tools parity
    const aiActive = await hospitalAiTools.getActiveRequests({ userId: hospA.userId });
    expect(aiActive.totalActive).toBe(1);
    expect(aiActive.activeRequests[0].patientName).toBe('Sharma');

    const aiIncoming = await hospitalAiTools.getIncomingDemands({ userId: hospA.userId });
    expect(aiIncoming.pendingDemandsCount).toBe(0);
  });

  test('Another hospital logs in: request does NOT appear in their dashboard (Active or Incoming)', async () => {
    const hospA = await createVerifiedHospital('Hospital Alpha', 'alpha@hospital.com');
    const hospB = await createVerifiedHospital('Hospital Beta', 'beta@hospital.com');

    // Hospital A creates request
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${hospA.token}`)
      .send({
        patientName: 'Alpha Patient',
        bloodGroup: 'O-',
        unitsNeeded: 1,
        urgency: 'high',
        hospitalId: hospA.hospital._id,
      });

    // Hospital B checks Active Requests
    const resBActive = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${hospB.token}`);

    expect(resBActive.status).toBe(200);
    expect(resBActive.body.data.length).toBe(0);

    // Hospital B checks Incoming Demands
    const resBIncoming = await request(app)
      .get('/api/requests/hospital/incoming')
      .set('Authorization', `Bearer ${hospB.token}`);

    expect(resBIncoming.status).toBe(200);
    expect(resBIncoming.body.data.length).toBe(0);

    // Hospital B AI tools
    const aiActiveB = await hospitalAiTools.getActiveRequests({ userId: hospB.userId });
    expect(aiActiveB.totalActive).toBe(0);

    const aiIncomingB = await hospitalAiTools.getIncomingDemands({ userId: hospB.userId });
    expect(aiIncomingB.pendingDemandsCount).toBe(0);
  });

  test('Patient creates request addressed to Hospital A: appears in Incoming Demands, not Active Requests', async () => {
    const hospA = await createVerifiedHospital('Hospital Alpha', 'hospalpha@lifelink.com');
    const patientUser = await registerUser(app, { email: 'patient@test.com' });

    // Patient submits emergency request directed to Hospital A
    const patientReqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Caregiver Patient',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hospA.hospital._id,
      });

    expect(patientReqRes.status).toBe(201);
    expect(patientReqRes.body.data.status).toBe('pending_hospital_review');

    // Hospital A Incoming Demands: should contain 1 pending request
    const incomingRes = await request(app)
      .get('/api/requests/hospital/incoming')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(incomingRes.status).toBe(200);
    expect(incomingRes.body.data.length).toBe(1);
    expect(incomingRes.body.data[0].patientName).toBe('Caregiver Patient');
    expect(incomingRes.body.data[0].status).toBe('pending_hospital_review');

    // Hospital A Active Requests: should be 0 (still awaiting review)
    const activeRes = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.length).toBe(0);

    // AI tool checks
    const aiIncoming = await hospitalAiTools.getIncomingDemands({ userId: hospA.userId });
    expect(aiIncoming.pendingDemandsCount).toBe(1);

    const aiActive = await hospitalAiTools.getActiveRequests({ userId: hospA.userId });
    expect(aiActive.totalActive).toBe(0);
  });

  test('Hospital A accepts patient request: moves from Incoming Demands to Active Requests', async () => {
    const hospA = await createVerifiedHospital('Hospital Alpha', 'alphaaccept@lifelink.com');
    // Set 0 stock for AB+ so shortfall broadcasts to donors (status becomes 'open' / active)
    hospA.hospital.inventory = [{ bloodGroup: 'AB+', units: 0 }];
    await hospA.hospital.save();

    const patientUser = await registerUser(app, { email: 'patientaccept@test.com' });

    // Patient creates request directed to Hospital A
    const patientReqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Awaiting Acceptance',
        bloodGroup: 'AB+',
        unitsNeeded: 3,
        urgency: 'high',
        targetHospital: hospA.hospital._id,
      });

    const requestId = patientReqRes.body.data._id;

    // Hospital accepts request (with 0 initial inventory -> broadcast remaining to donors -> status 'open')
    const acceptRes = await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospA.token}`)
      .send();

    expect(acceptRes.status).toBe(200);
    expect(['open', 'partially_fulfilled']).toContain(acceptRes.body.data.request.status);

    // Incoming Demands should now be 0
    const incomingRes = await request(app)
      .get('/api/requests/hospital/incoming')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(incomingRes.body.data.length).toBe(0);

    // Active Requests should now contain the accepted request
    const activeRes = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(activeRes.body.data.length).toBe(1);
    expect(activeRes.body.data[0].patientName).toBe('Awaiting Acceptance');

    // AI tool check
    const aiActive = await hospitalAiTools.getActiveRequests({ userId: hospA.userId });
    expect(aiActive.totalActive).toBe(1);

    const aiIncoming = await hospitalAiTools.getIncomingDemands({ userId: hospA.userId });
    expect(aiIncoming.pendingDemandsCount).toBe(0);
  });

  test('Seeded request (Kaneesh, B+) appears in City General Active Requests, badge equals list length and AI count', async () => {
    const hospA = await createVerifiedHospital('City General Emergency Hospital', 'citygen_seed@lifelink.com');

    // Seeded Kaneesh request
    await BloodRequest.create({
      patientName: 'Kaneesh',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      unitsFulfilled: 0,
      urgency: 'critical',
      status: 'open',
      targetHospital: hospA.hospital._id,
      hospital: hospA.hospital._id,
      requester: hospA.userId,
    });

    // Also create second active request
    await BloodRequest.create({
      patientName: 'Sharma',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      unitsFulfilled: 0,
      urgency: 'critical',
      status: 'open',
      targetHospital: hospA.hospital._id,
      hospital: hospA.hospital._id,
      requester: hospA.userId,
    });

    const activeRes = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.length).toBe(2);

    const names = activeRes.body.data.map(r => r.patientName);
    expect(names).toContain('Kaneesh');
    expect(names).toContain('Sharma');

    // Shared bundle counts
    const bundle = await hospitalRequestRules.getHospitalRequestsBundle(hospA.hospital);
    expect(bundle.activeCount).toBe(2);
    expect(bundle.incomingCount).toBe(0);

    // AI tool parity
    const aiActive = await hospitalAiTools.getActiveRequests({ userId: hospA.userId });
    expect(aiActive.totalActive).toBe(2);
    expect(aiActive.totalActive).toBe(activeRes.body.data.length);

    const aiIncoming = await hospitalAiTools.getIncomingDemands({ userId: hospA.userId });
    expect(aiIncoming.pendingDemandsCount).toBe(0);
  });
});
