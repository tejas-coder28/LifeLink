/**
 * tests/donationDates.test.js
 *
 * Tests for donation date lifecycle (pledgedAt, donatedAt, confirmedAt),
 * server validation on confirmation, cooldown math from donatedAt,
 * donor history / AI tool formatting, and one-time migration idempotency.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital, registerAdmin } = require('./helpers/auth');
const { MAX_DONATION_BACKDATE_DAYS, MS_PER_DAY, calculateEligibility, computeNextEligibleDate } = require('../src/utils/eligibility');
const { formatDate } = require('../src/utils/dateFormatter');
const { executeTool } = require('../src/services/aiTools');
const { migrateDonationDates } = require('../scripts/migrateDonationDates');

let app;
let User;
let Hospital;
let BloodRequest;
let DonorProfile;
let Donation;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  User = require('../src/repositories/user.repository');
  Hospital = require('../src/repositories/hospital.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  Donation = require('../src/repositories/donation.repository');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

async function setupVerifiedHospital(name = 'Date Test Hospital') {
  const { user, token } = await registerHospital(app, {
    name,
    email: `hosp_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  const hospital = await Hospital.findOne({ user: user._id || user.id });
  hospital.name = name;
  hospital.isVerified = true;
  hospital.address = `${name} Campus, New Delhi`;
  hospital.location = { type: 'Point', coordinates: [77.209, 28.6139] };
  hospital.inventory = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => ({
    bloodGroup: bg,
    units: 0,
  }));
  await hospital.save();
  return { user, token, hospital };
}

async function createOpenRequest(requesterToken, hospitalId, bloodGroup = 'B+') {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      patientName: 'Test Patient',
      bloodGroup,
      unitsNeeded: 1,
      urgency: 'high',
      targetHospital: hospitalId.toString(),
      address: 'New Delhi Medical Hub',
    });

  const requestId = res.body?.data?._id;
  if (requestId) {
    await BloodRequest.findByIdAndUpdate(requestId, {
      status: 'open',
      unitsFromDonors: 1,
    });
  }
  return requestId;
}

describe('Donation date validation, cooldown calculation, and history consistency', () => {
  test('donatedAt in the future returns 400 and leaves pledge/profile untouched', async () => {
    const { token: hospToken, hospital } = await setupVerifiedHospital();
    const requester = await registerUser(app, { bloodGroup: 'O+' });
    const donor = await registerUser(app, { bloodGroup: 'O+' });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'O+');

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, units: 1 });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`)
      .send({ donatedAt: futureDate });

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.success).toBe(false);
    expect(confirmRes.body.message).toMatch(/future/i);

    const saved = await Donation.findById(donationId);
    expect(saved.status).toBe('pledged');
    expect(saved.donatedAt).toBeNull();
    const dp = await DonorProfile.findOne({ user: donor.user._id });
    expect(dp.lastDonationDate).toBeNull();
  });

  test('donatedAt before pledgedAt returns 400 and leaves pledge/profile untouched', async () => {
    const { token: hospToken, hospital } = await setupVerifiedHospital();
    const requester = await registerUser(app, { bloodGroup: 'A+' });
    const donor = await registerUser(app, { bloodGroup: 'A+' });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'A+');

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, units: 1 });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;
    const pledgedAt = new Date(pledgeRes.body.data.pledgedAt || pledgeRes.body.data.createdAt);

    const beforePledge = new Date(pledgedAt.getTime() - 60 * 60 * 1000).toISOString();
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`)
      .send({ donatedAt: beforePledge });

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.success).toBe(false);
    expect(confirmRes.body.message).toMatch(/before the pledge/i);

    const saved = await Donation.findById(donationId);
    expect(saved.status).toBe('pledged');
    expect(saved.donatedAt).toBeNull();
    const dp = await DonorProfile.findOne({ user: donor.user._id });
    expect(dp.lastDonationDate).toBeNull();
  });

  test('donatedAt older than MAX_DONATION_BACKDATE_DAYS (7 days) returns 409 for hospital', async () => {
    const { token: hospToken, hospital } = await setupVerifiedHospital();
    const requester = await registerUser(app, { bloodGroup: 'B+' });
    const donor = await registerUser(app, { bloodGroup: 'B+' });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'B+');

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, units: 1 });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Simulate a pledge made 12 days ago and donated 10 days ago (> 7-day limit)
    const twelveDaysAgo = new Date(Date.now() - 12 * MS_PER_DAY);
    const tenDaysAgo = new Date(Date.now() - 10 * MS_PER_DAY);
    await Donation.findByIdAndUpdate(donationId, { pledgedAt: twelveDaysAgo, createdAt: twelveDaysAgo });

    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`)
      .send({ donatedAt: tenDaysAgo.toISOString() });

    expect(confirmRes.status).toBe(409);
    expect(confirmRes.body.success).toBe(false);
    expect(confirmRes.body.message).toMatch(new RegExp(`${MAX_DONATION_BACKDATE_DAYS} days`, 'i'));

    const saved = await Donation.findById(donationId);
    expect(saved.status).toBe('pledged');
    const updatedHosp = await Hospital.findById(hospital._id);
    expect(updatedHosp.inventory.find((i) => i.bloodGroup === 'B+').units).toBe(0);
  });

  test('donatedAt older than 7 days is allowed for admin and sets server confirmedAt', async () => {
    const { hospital } = await setupVerifiedHospital();
    const admin = await registerAdmin(app);
    const requester = await registerUser(app, { bloodGroup: 'AB+' });
    const donor = await registerUser(app, { bloodGroup: 'AB+' });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'AB+');

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, units: 1 });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    const twelveDaysAgo = new Date(Date.now() - 12 * MS_PER_DAY);
    const tenDaysAgo = new Date(Date.now() - 10 * MS_PER_DAY - 60 * 1000);
    await Donation.findByIdAndUpdate(donationId, { pledgedAt: twelveDaysAgo, createdAt: twelveDaysAgo });

    const beforeConfirmMs = Date.now();
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ donatedAt: tenDaysAgo.toISOString() });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);

    const saved = await Donation.findById(donationId);
    expect(saved.status).toBe('completed');
    expect(new Date(saved.pledgedAt).getTime()).toBe(twelveDaysAgo.getTime());
    expect(new Date(saved.donatedAt).getTime()).toBe(tenDaysAgo.getTime());
    expect(new Date(saved.confirmedAt).getTime()).toBeGreaterThanOrEqual(beforeConfirmMs - 1000);
    expect(new Date(saved.confirmedAt).getTime() - new Date(saved.donatedAt).getTime()).toBeGreaterThan(9 * MS_PER_DAY);
  });

  test('cooldown and next-eligible date are computed from donatedAt (10 days before confirm -> 90 days from donatedAt)', async () => {
    const { hospital } = await setupVerifiedHospital();
    const admin = await registerAdmin(app);
    const requester = await registerUser(app, { bloodGroup: 'O-' });
    const donor = await registerUser(app, { bloodGroup: 'O-' });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'O-');

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, units: 1 });
    const donationId = pledgeRes.body.data._id;

    const fifteenDaysAgo = new Date(Date.now() - 15 * MS_PER_DAY);
    const tenDaysAgo = new Date(Date.now() - 10 * MS_PER_DAY - 60 * 1000);
    await Donation.findByIdAndUpdate(donationId, { pledgedAt: fifteenDaysAgo, createdAt: fifteenDaysAgo });

    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ donatedAt: tenDaysAgo.toISOString() });
    expect(confirmRes.status).toBe(200);

    const dp = await DonorProfile.findOne({ user: donor.user._id });
    expect(dp.lastDonationDate.getTime()).toBe(tenDaysAgo.getTime());

    const eligibility = calculateEligibility(dp.lastDonationDate, confirmRes.body.data.confirmedAt);
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.daysLeft).toBe(80);
    expect(eligibility.nextEligibleDate.getTime() - tenDaysAgo.getTime()).toBe(90 * MS_PER_DAY);

    const aiEligibility = await executeTool('getEligibility', {}, { role: 'donor', userId: donor.user._id });
    expect(aiEligibility.isEligible).toBe(false);
    expect(aiEligibility.daysLeft).toBe(80);
    expect(aiEligibility.lastDonationDate).toBe(formatDate(tenDaysAgo));
    expect(aiEligibility.nextEligibleDate).toBe(formatDate(computeNextEligibleDate(tenDaysAgo)));

    // Subsequent pledge is blocked by cooldown
    const reqId2 = await createOpenRequest(requester.token, hospital._id, 'O-');
    const blockedRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: reqId2, units: 1 });
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.message).toMatch(/80 day\(s\) remaining/i);
  });

  test('donor.lastDonationDate stays equal to donatedAt of the latest fulfilled donation on older admin backfill', async () => {
    const { hospital } = await setupVerifiedHospital();
    const admin = await registerAdmin(app);
    const requester = await registerUser(app, { bloodGroup: 'B+' });
    const donor = await registerUser(app, { bloodGroup: 'B+' });
    const dp = await DonorProfile.findOne({ user: donor.user._id });

    const latestDonatedAt = new Date(Date.now() - 5 * MS_PER_DAY);
    const olderPledgedAt = new Date(Date.now() - 25 * MS_PER_DAY);
    const olderDonatedAt = new Date(Date.now() - 20 * MS_PER_DAY);

    const req1Id = await createOpenRequest(requester.token, hospital._id, 'B+');
    await Donation.create({
      donor: donor.user._id,
      donorProfile: dp._id,
      request: req1Id,
      unitsDonated: 1,
      status: 'completed',
      pledgedAt: new Date(Date.now() - 7 * MS_PER_DAY),
      donatedAt: latestDonatedAt,
      confirmedAt: latestDonatedAt,
      completedAt: latestDonatedAt,
      fulfilledAt: latestDonatedAt,
    });
    await DonorProfile.findByIdAndUpdate(dp._id, {
      lastDonationDate: latestDonatedAt,
      completedDonations: 1,
      totalDonations: 1,
    });

    const req2Id = await createOpenRequest(requester.token, hospital._id, 'B+');
    const olderPledge = await Donation.create({
      donor: donor.user._id,
      donorProfile: dp._id,
      request: req2Id,
      unitsDonated: 1,
      status: 'pledged',
      pledgedAt: olderPledgedAt,
      createdAt: olderPledgedAt,
    });

    const confirmOlderRes = await request(app)
      .patch(`/api/donations/${olderPledge._id}/complete`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ donatedAt: olderDonatedAt.toISOString() });
    expect(confirmOlderRes.status).toBe(200);

    const refreshedDp = await DonorProfile.findById(dp._id);
    expect(refreshedDp.lastDonationDate.getTime()).toBe(latestDonatedAt.getTime());
    expect(refreshedDp.completedDonations).toBe(2);
  });

  test('donation history endpoint and AI tools expose pledgedAt, donatedAt, confirmedAt and format dates consistently', async () => {
    const { hospital } = await setupVerifiedHospital();
    const requester = await registerUser(app, { bloodGroup: 'O+' });
    const donor = await registerUser(app, { name: 'Tejas History', bloodGroup: 'O+' });
    const dp = await DonorProfile.findOne({ user: donor.user._id });

    const pledgedAt = new Date('2026-11-07T10:00:00.000Z');
    const donatedAt = new Date('2026-11-18T10:00:00.000Z');
    const confirmedAt = new Date('2026-11-18T12:00:00.000Z');
    const releasedAt = new Date('2026-11-20T10:00:00.000Z');

    const reqCompleted = await createOpenRequest(requester.token, hospital._id, 'O+');
    await Donation.create({
      donor: donor.user._id,
      donorProfile: dp._id,
      request: reqCompleted,
      hospitalName: hospital.name,
      unitsDonated: 1,
      status: 'completed',
      pledgedAt,
      donatedAt,
      confirmedAt,
      completedAt: confirmedAt,
      fulfilledAt: confirmedAt,
    });

    const reqReleased = await createOpenRequest(requester.token, hospital._id, 'O+');
    await Donation.create({
      donor: donor.user._id,
      donorProfile: dp._id,
      request: reqReleased,
      hospitalName: hospital.name,
      unitsDonated: 1,
      status: 'released',
      pledgedAt: new Date('2026-11-19T10:00:00.000Z'),
      releasedAt,
      releasedReason: 'request_cancelled',
    });

    const historyRes = await request(app)
      .get('/api/donations/history')
      .set('Authorization', `Bearer ${donor.token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBe(2);

    const completedRecord = historyRes.body.data.find((d) => d.status === 'completed');
    const releasedRecord = historyRes.body.data.find((d) => d.status === 'released');

    expect(formatDate(completedRecord.pledgedAt)).toBe('7 Nov 2026');
    expect(formatDate(completedRecord.donatedAt)).toBe('18 Nov 2026');
    expect(formatDate(completedRecord.confirmedAt)).toBe('18 Nov 2026');
    expect(formatDate(computeNextEligibleDate(completedRecord.donatedAt))).toBe('16 Feb 2027');

    expect(formatDate(releasedRecord.pledgedAt)).toBe('19 Nov 2026');
    expect(formatDate(releasedRecord.releasedAt)).toBe('20 Nov 2026');

    const aiHistory = await executeTool('getMyDonationHistory', {}, { role: 'donor', userId: donor.user._id });
    const aiCompleted = aiHistory.records.find((r) => r.status === 'completed');
    expect(aiCompleted.pledgedAt).toBe('7 Nov 2026');
    expect(aiCompleted.donatedAt).toBe('18 Nov 2026');
    expect(aiCompleted.confirmedAt).toBe('18 Nov 2026');
    expect(aiCompleted.nextEligibleDate).toBe('16 Feb 2027');
  });

  test('migrateDonationDates sets donatedAt = confirmedAt for legacy fulfilled donations and syncs donor.lastDonationDate idempotently', async () => {
    const { hospital } = await setupVerifiedHospital();
    const requester = await registerUser(app, { bloodGroup: 'B+' });
    const donor = await registerUser(app, { name: 'Legacy Donor', bloodGroup: 'B+' });
    const dp = await DonorProfile.findOne({ user: donor.user._id });
    const requestId = await createOpenRequest(requester.token, hospital._id, 'B+');

    const legacyPledgeDate = new Date('2026-11-07T10:00:00.000Z');
    const legacyConfirmDate = new Date('2026-11-18T10:00:00.000Z');

    // Insert raw legacy document bypassing repository defaults
    const mongoose = require('mongoose');
    const oid = (val) => mongoose.Types.ObjectId.createFromHexString(val.toString());
    const DonationModel = require('../src/models/Donation');
    const insertRes = await DonationModel.collection.insertOne({
      donor: oid(dp.user),
      donorProfile: oid(dp._id),
      request: oid(requestId),
      unitsDonated: 1,
      status: 'completed',
      donationDate: legacyConfirmDate,
      completedAt: legacyConfirmDate,
      fulfilledAt: legacyConfirmDate,
      createdAt: legacyPledgeDate,
      updatedAt: legacyConfirmDate,
    });

    // Ensure profile initially has null lastDonationDate
    await DonorProfile.findByIdAndUpdate(dp._id, { lastDonationDate: null });

    const firstRun = await migrateDonationDates();
    expect(firstRun.donationsModified).toBe(1);
    expect(firstRun.profilesModified).toBe(1);

    const migratedDoc = await DonationModel.findById(insertRes.insertedId).lean();
    expect(new Date(migratedDoc.pledgedAt).getTime()).toBe(legacyPledgeDate.getTime());
    expect(new Date(migratedDoc.confirmedAt).getTime()).toBe(legacyConfirmDate.getTime());
    expect(new Date(migratedDoc.donatedAt).getTime()).toBe(legacyConfirmDate.getTime());

    const migratedProfile = await DonorProfile.findById(dp._id);
    expect(new Date(migratedProfile.lastDonationDate).getTime()).toBe(legacyConfirmDate.getTime());

    // Re-running migration is idempotent
    const secondRun = await migrateDonationDates();
    expect(secondRun.donationsModified).toBe(0);
    expect(secondRun.profilesModified).toBe(0);
  });
});
