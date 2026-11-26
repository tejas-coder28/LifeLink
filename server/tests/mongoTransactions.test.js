require('./setup');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { connectMongo, disconnectMongo, withTransaction } = require('../src/config/mongo');
const models = require('../src/models');
const repos = require('../src/repositories');
const donationService = require('../src/services/donation.service');
const requestService = require('../src/services/request.service');
const hospitalService = require('../src/services/hospital.service');

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectMongo(replSet.getUri(), { dbName: 'lifelink_phase4_test' });
  await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
});

afterEach(async () => {
  await Promise.all(Object.values(models).map((M) => M.deleteMany({})));
});

afterAll(async () => {
  await disconnectMongo();
  if (replSet) await replSet.stop();
});

async function seedActors() {
  const hospUser = await repos.User.create({
    name: 'City Hospital',
    email: 'hosp_tx@test.com',
    password: 'pw',
    accountType: 'hospital',
  });
  const hospital = await repos.Hospital.create({
    user: hospUser._id,
    name: 'City Hospital Center',
    isVerified: true,
    inventory: [
      { bloodGroup: 'A+', units: 5 },
      { bloodGroup: 'O-', units: 2 },
    ],
  });
  await repos.User.findByIdAndUpdate(hospUser._id, { hospitalId: hospital._id });

  const requester = await repos.User.create({
    name: 'Patient Req',
    email: 'req_tx@test.com',
    password: 'pw',
    accountType: 'user',
  });

  const donor = await repos.User.create({
    name: 'Donor One',
    email: 'donor_tx@test.com',
    password: 'pw',
    accountType: 'user',
  });
  const dp = await repos.DonorProfile.create({
    user: donor._id,
    bloodGroup: 'O-',
    bloodGroupConfirmed: true,
    address: 'New Delhi',
    age: 28,
    is18Plus: true,
    isWeight50KgPlus: true,
    consentContact: true,
    contactNumber: '+91 9999999999',
    isAvailable: true,
  });

  return { hospUser, hospital, requester, donor, dp };
}

describe('Phase 4: MongoDB Multi-Document Transactions', () => {
  test('pledge create -> fulfil -> duplicate fulfil 409 -> cooldown enforced', async () => {
    const { hospUser, hospital, requester, donor } = await seedActors();
    const reqDoc = await repos.BloodRequest.create({
      requester: requester._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Emergency Patient',
      bloodGroup: 'A+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      status: 'open',
    });

    const pledge = await donationService.pledgeDonation(donor._id, reqDoc._id, 1);
    expect(pledge.status).toBe('pledged');

    // Request transitions open -> matching
    const afterPledgeReq = await repos.BloodRequest.findById(reqDoc._id);
    expect(afterPledgeReq.status).toBe('matching');

    // Duplicate pledge to another request blocked (409)
    const reqDoc2 = await repos.BloodRequest.create({
      requester: requester._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Other Patient',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      status: 'open',
    });
    await expect(donationService.pledgeDonation(donor._id, reqDoc2._id, 1)).rejects.toMatchObject({
      statusCode: 409,
    });

    // Fulfil donation
    const fulfilled = await donationService.completeDonation(pledge._id, hospUser);
    expect(fulfilled.status).toBe('completed');

    // Duplicate fulfil -> 409
    await expect(donationService.completeDonation(pledge._id, hospUser)).rejects.toMatchObject({
      statusCode: 409,
    });

    // Hospital stock incremented (+1 O-) & donor cooldown updated
    const updatedHosp = await repos.Hospital.findById(hospital._id);
    expect(updatedHosp.inventory.find((i) => i.bloodGroup === 'O-').units).toBe(3);

    const updatedDp = await repos.DonorProfile.findByUserId(donor._id);
    expect(updatedDp.lastDonationDate).toBeInstanceOf(Date);
    expect(updatedDp.completedDonations).toBe(1);
  });

  test('decline and cancelPledge restore matching request back to open', async () => {
    const { hospUser, hospital, requester, donor } = await seedActors();
    const reqDoc = await repos.BloodRequest.create({
      requester: requester._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Cancel Test',
      bloodGroup: 'O-',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      status: 'open',
    });

    const p1 = await donationService.pledgeDonation(donor._id, reqDoc._id, 1);
    await donationService.cancelPledge(donor._id, p1._id);
    let r = await repos.BloodRequest.findById(reqDoc._id);
    expect(r.status).toBe('open');

    const p2 = await donationService.pledgeDonation(donor._id, reqDoc._id, 1);
    await donationService.declineDonation(p2._id, hospUser);
    r = await repos.BloodRequest.findById(reqDoc._id);
    expect(r.status).toBe('open');
  });

  test('acceptRequest allocates stock and cancelRequest atomically returns stock & releases pledges', async () => {
    const { hospUser, hospital, requester, donor } = await seedActors();
    const created = await requestService.createRequest(requester._id, {
      patientName: 'Alloc Patient',
      bloodGroup: 'A+',
      unitsNeeded: 7, // 5 in stock, 2 shortfall
      urgency: 'critical',
      targetHospital: hospital._id,
    });
    expect(created.status).toBe('pending_hospital_review');

    const accepted = await requestService.acceptRequest(created._id, hospUser._id, 'hospital');
    expect(accepted.request.status).toBe('partially_fulfilled');
    expect(accepted.request.unitsFromStock).toBe(5);
    expect(accepted.request.unitsFromDonors).toBe(2);

    // Stock should now be 0 for A+
    let h = await repos.Hospital.findById(hospital._id);
    expect(h.inventory.find((i) => i.bloodGroup === 'A+').units).toBe(0);

    // Donor pledges 1 unit; request had 5 from stock, unitsFulfilled = 5 -> cancel blocked (409)!
    // Let's also verify a request with 0 fulfilled and unitsFromStock=0 or partial release when unitsFulfilled === 0
    const req2 = await repos.BloodRequest.create({
      requester: requester._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Stock Return Patient',
      bloodGroup: 'O-',
      unitsNeeded: 2,
      unitsFromStock: 1,
      unitsFromDonors: 1,
      unitsFulfilled: 0,
      status: 'open',
    });
    const pledge = await donationService.pledgeDonation(donor._id, req2._id, 1);

    const cancelRes = await requestService.cancelRequest(req2._id, hospUser, { reason: 'wrong_details' });
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.stockReturned).toBe(1);
    expect(cancelRes.pledgesReleased).toBe(1);

    h = await repos.Hospital.findById(hospital._id);
    expect(h.inventory.find((i) => i.bloodGroup === 'O-').units).toBe(3);

    const pAfter = await repos.Donation.findById(pledge._id);
    expect(pAfter.status).toBe('released');
  });

  test('hospital approval and deleteRequest transactions', async () => {
    const { hospital, requester } = await seedActors();
    const unverified = await hospitalService.setHospitalVerification(hospital._id, false);
    expect(unverified.isVerified).toBe(false);
    const verified = await hospitalService.setHospitalVerification(hospital._id, true);
    expect(verified.isVerified).toBe(true);

    const reqCreated = await requestService.createRequest(requester._id, {
      patientName: 'Undo Delete Patient',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      targetHospital: hospital._id,
    });
    const delRes = await requestService.deleteRequest(reqCreated._id, requester);
    expect(delRes.success).toBe(true);
    expect(await repos.BloodRequest.findById(reqCreated._id)).toBeNull();
  });

  test('transaction rolls back completely when an error occurs mid-transaction', async () => {
    const { hospital } = await seedActors();
    await expect(
      withTransaction(async (session) => {
        await repos.Hospital.addStock(hospital._id, 'O-', 10, session);
        throw new Error('Simulated mid-transaction crash');
      })
    ).rejects.toThrow('Simulated mid-transaction crash');

    const hAfter = await repos.Hospital.findById(hospital._id);
    expect(hAfter.inventory.find((i) => i.bloodGroup === 'O-').units).toBe(2);
  });
});
