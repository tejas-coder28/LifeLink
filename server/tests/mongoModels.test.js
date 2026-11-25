require('./setup');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { connectMongo, disconnectMongo, isMongoConnected, getDbName } = require('../src/config/mongo');
const models = require('../src/models');

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await connectMongo(uri, { dbName: 'lifelink_phase2_test' });
  await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
});

afterAll(async () => {
  await disconnectMongo();
  if (replSet) {
    await replSet.stop();
  }
});

describe('Phase 2: MongoDB Connection & Mongoose Models', () => {
  test('connectMongo establishes replica set connection and reports db name', () => {
    expect(isMongoConnected()).toBe(true);
    expect(getDbName()).toBe('lifelink_phase2_test');
  });

  test('User model maps _id to id and enforces unique email', async () => {
    const user = await models.User.create({
      name: 'Model Test User',
      email: 'MODEL@Test.com',
      password: 'hashedpassword123',
      accountType: 'user',
    });

    const json = user.toJSON();
    expect(json._id).toBeDefined();
    expect(json.id).toBe(json._id.toString());
    expect(json.email).toBe('model@test.com');

    await expect(
      models.User.create({
        name: 'Dup User',
        email: 'model@test.com',
        password: 'hashedpassword123',
      })
    ).rejects.toThrow(/duplicate key|E11000/i);
  });

  test('Donation model enforces partial unique index for active pledged donations', async () => {
    const donor = await models.User.create({
      name: 'Donor One',
      email: 'donor_idx@test.com',
      password: 'pw',
    });
    const req1 = await models.BloodRequest.create({
      requester: donor._id,
      patientName: 'Patient 1',
      bloodGroup: 'O+',
      unitsNeeded: 1,
    });
    const req2 = await models.BloodRequest.create({
      requester: donor._id,
      patientName: 'Patient 2',
      bloodGroup: 'O+',
      unitsNeeded: 1,
    });

    await models.Donation.create({
      donor: donor._id,
      request: req1._id,
      unitsDonated: 1,
      status: 'pledged',
    });

    await expect(
      models.Donation.create({
        donor: donor._id,
        request: req2._id,
        unitsDonated: 1,
        status: 'pledged',
      })
    ).rejects.toThrow(/duplicate key|E11000/i);

    // Completed/cancelled pledges should NOT trigger duplicate key error
    const completed = await models.Donation.create({
      donor: donor._id,
      request: req2._id,
      unitsDonated: 1,
      status: 'completed',
    });
    expect(completed.id).toBe(completed._id.toString());
  });
});
