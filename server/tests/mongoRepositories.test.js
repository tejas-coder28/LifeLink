require('./setup');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { connectMongo, disconnectMongo } = require('../src/config/mongo');
const models = require('../src/models');
const repos = require('../src/repositories');

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectMongo(replSet.getUri(), { dbName: 'lifelink_phase3_test' });
  await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
});

afterEach(async () => {
  await Promise.all(Object.values(models).map((M) => M.deleteMany({})));
});

afterAll(async () => {
  await disconnectMongo();
  if (replSet) await replSet.stop();
});

describe('Phase 3: Uniform MongoDB Repositories', () => {
  test('User repository supports password hashing, matchPassword, findByEmail, and id normalization', async () => {
    const created = await repos.User.create({
      name: 'Alice Donor',
      email: 'ALICE@Example.com',
      password: 'secretPassword123',
      accountType: 'user',
    });

    expect(typeof created._id).toBe('string');
    expect(created.id).toBe(created._id);
    expect(created.email).toBe('alice@example.com');
    expect(await created.matchPassword('secretPassword123')).toBe(true);
    expect(await created.matchPassword('wrong')).toBe(false);

    const found = await repos.User.findByEmail('alice@example.com');
    expect(found.id).toBe(created.id);
    expect(await found.matchPassword('secretPassword123')).toBe(true);
  });

  test('Invalid ObjectId passed to findById returns null instead of throwing CastError', async () => {
    const missing = await repos.BloodRequest.findById('not-a-valid-object-id');
    expect(missing).toBeNull();
  });

  test('QueryBuilder supports projections, sorting, limit, skip, paginate, and populate', async () => {
    const u = await repos.User.create({ name: 'Req User', email: 'req@test.com', password: 'pw' });
    const h = await repos.Hospital.create({ user: u._id, name: 'General Hosp', isVerified: true });

    for (let i = 1; i <= 5; i++) {
      await repos.BloodRequest.create({
        requester: u._id,
        targetHospital: h._id,
        patientName: `Patient ${i}`,
        bloodGroup: 'A+',
        unitsNeeded: i,
        status: 'open',
      });
    }

    const page1 = await repos.BloodRequest.paginate(
      { targetHospital: h._id },
      { page: 1, limit: 2, sort: { unitsNeeded: -1 }, populate: [{ path: 'requester', select: 'name email' }] }
    );
    expect(page1.total).toBe(5);
    expect(page1.pages).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].unitsNeeded).toBe(5);
    expect(page1.items[0].requester.name).toBe('Req User');
    expect(page1.items[0].requester.password).toBeUndefined();
  });

  test('Hospital deductStock and addStock enforce non-negative inventory', async () => {
    const u = await repos.User.create({ name: 'Hosp User', email: 'hosp@test.com', password: 'pw', accountType: 'hospital' });
    const h = await repos.Hospital.create({
      user: u._id,
      name: 'Stock Hospital',
      inventory: [{ bloodGroup: 'O-', units: 3 }],
    });

    const afterDeduct = await repos.Hospital.deductStock(h._id, 'O-', 2);
    expect(afterDeduct.inventory.find((i) => i.bloodGroup === 'O-').units).toBe(1);

    await expect(repos.Hospital.deductStock(h._id, 'O-', 2)).rejects.toThrow(/Insufficient stock/i);

    const afterAdd = await repos.Hospital.addStock(h._id, 'O-', 4);
    expect(afterAdd.inventory.find((i) => i.bloodGroup === 'O-').units).toBe(5);
  });
});
