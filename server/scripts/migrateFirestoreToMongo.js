/**
 * migrateFirestoreToMongo.js
 *
 * One-time idempotent migration script that exports all historical documents
 * from Cloud Firestore (project configured in serviceAccountKey.json) and
 * imports them into the target MongoDB database configured in server/.env.
 *
 * Usage: node scripts/migrateFirestoreToMongo.js
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { connectMongo, disconnectMongo } = require('../src/config/mongo');
const { checkMongoIndexes } = require('../src/utils/indexChecker');
const models = require('../src/models');

function deterministicObjectId(firestoreId) {
  if (!firestoreId || typeof firestoreId !== 'string') return null;
  if (/^[a-fA-F0-9]{24}$/.test(firestoreId)) {
    return new mongoose.Types.ObjectId(firestoreId);
  }
  const hex = crypto
    .createHash('sha256')
    .update(`lifelink-firestore:${firestoreId}`)
    .digest('hex')
    .slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
}

function toDate(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'object' && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000 + Math.floor((val._nanoseconds || 0) / 1e6));
  }
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeLocation(loc, fallback = [77.2090, 28.6139]) {
  if (!loc) return { type: 'Point', coordinates: fallback };
  if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
    return {
      type: 'Point',
      coordinates: [Number(loc.coordinates[0]), Number(loc.coordinates[1])],
    };
  }
  if (typeof loc.longitude === 'number' && typeof loc.latitude === 'number') {
    return { type: 'Point', coordinates: [loc.longitude, loc.latitude] };
  }
  if (typeof loc._longitude === 'number' && typeof loc._latitude === 'number') {
    return { type: 'Point', coordinates: [loc._longitude, loc._latitude] };
  }
  if (typeof loc.lng === 'number' && typeof loc.lat === 'number') {
    return { type: 'Point', coordinates: [loc.lng, loc.lat] };
  }
  return { type: 'Point', coordinates: fallback };
}

function convertValueDeep(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date || typeof val?.toDate === 'function' || typeof val?._seconds === 'number') {
    return toDate(val);
  }
  if (Array.isArray(val)) return val.map(convertValueDeep);
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = convertValueDeep(v);
    }
    return out;
  }
  return val;
}

async function validatedInsert(Model, rawDocs) {
  if (!rawDocs.length) return 0;
  const prepared = [];
  for (const raw of rawDocs) {
    const doc = new Model(raw);
    await doc.validate();
    const obj = doc.toObject({ virtuals: false });
    if (raw.createdAt) obj.createdAt = raw.createdAt;
    if (raw.updatedAt) obj.updatedAt = raw.updatedAt;
    prepared.push(obj);
  }
  await Model.collection.insertMany(prepared, { ordered: true });
  return prepared.length;
}

async function run() {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, '../serviceAccountKey.json');

  const sa = require(saPath);
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(sa) });
  const firestore = getFirestore(app);

  await connectMongo();

  console.log('[Migration] Reading all collections from Firestore...');
  const readCollection = async (name) => {
    const snap = await firestore.collection(name).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  };

  const [
    fsUsers,
    fsHospitals,
    fsDonorProfiles,
    fsRequests,
    fsDonations,
    fsInvTx,
    fsPings,
    fsNotifications,
    fsAiInsights,
    fsLoginLogs,
    fsAuditLogs,
  ] = await Promise.all([
    readCollection('users'),
    readCollection('hospitals'),
    readCollection('donorProfiles'),
    readCollection('bloodRequests'),
    readCollection('donations'),
    readCollection('inventoryTransactions'),
    readCollection('donorRequestPings').catch(() => []),
    readCollection('notifications'),
    readCollection('aiInsights'),
    readCollection('loginLogs'),
    readCollection('audit_logs'),
  ]);

  console.log('[Migration] Clearing existing MongoDB collections before clean import...');
  await Promise.all(Object.values(models).map((M) => M.deleteMany({})));

  // 1. Users
  const usersDocs = fsUsers.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    name: data.name || 'LifeLink User',
    email: String(data.email || '').toLowerCase().trim(),
    password: data.password,
    accountType: ['user', 'hospital', 'admin'].includes(data.accountType) ? data.accountType : 'user',
    hospitalId: data.hospitalId ? deterministicObjectId(data.hospitalId) : null,
    phone: data.phone || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 2. Hospitals
  const hospitalsDocs = fsHospitals.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    user: deterministicObjectId(data.user),
    name: data.name || 'Hospital',
    licenseNumber: data.licenseNumber || '',
    address: data.address || '',
    location: normalizeLocation(data.location),
    phone: data.phone || '',
    inventory: Array.isArray(data.inventory) ? data.inventory : undefined,
    isVerified: Boolean(data.isVerified),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 3. DonorProfiles
  const donorProfileDocs = fsDonorProfiles.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    user: deterministicObjectId(data.user),
    bloodGroup: data.bloodGroup || '',
    bloodGroupConfirmed: Boolean(data.bloodGroupConfirmed),
    location: normalizeLocation(data.location),
    address: data.address || '',
    lastDonationDate: toDate(data.lastDonationDate),
    isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
    age: data.age ?? null,
    gender: data.gender ?? null,
    dob: data.dob ?? null,
    healthFlags: Array.isArray(data.healthFlags) ? data.healthFlags : ['none'],
    contactNumber: data.contactNumber || '',
    completedDonations: Number(data.completedDonations || 0),
    totalDonations: Number(data.totalDonations || 0),
    profileComplete: data.profileComplete,
    is18Plus: Boolean(data.is18Plus),
    isWeight50KgPlus: Boolean(data.isWeight50KgPlus),
    consentContact: Boolean(data.consentContact),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 4. BloodRequests
  const bloodRequestDocs = fsRequests.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    requester: deterministicObjectId(data.requester),
    hospital: data.hospital ? deterministicObjectId(data.hospital) : null,
    targetHospital: data.targetHospital ? deterministicObjectId(data.targetHospital) : null,
    hospitalName: data.hospitalName || '',
    patientName: data.patientName || '',
    bloodGroup: data.bloodGroup || 'O+',
    unitsNeeded: Number(data.unitsNeeded || 1),
    unitsFromStock: Number(data.unitsFromStock || 0),
    unitsFromDonors: Number(data.unitsFromDonors || 0),
    unitsFulfilled: Number(data.unitsFulfilled || 0),
    urgency: data.urgency || 'high',
    status: data.status || 'open',
    location: normalizeLocation(data.location),
    address: data.address || '',
    requiredByDate: toDate(data.requiredByDate) || new Date(),
    notes: data.notes || '',
    matchedDonorsCount: Number(data.matchedDonorsCount || 0),
    reviewedBy: data.reviewedBy ? deterministicObjectId(data.reviewedBy) : null,
    reviewedAt: toDate(data.reviewedAt),
    rejectionReason: data.rejectionReason || '',
    cancelledBy: data.cancelledBy ? deterministicObjectId(data.cancelledBy) : null,
    cancelledAt: toDate(data.cancelledAt),
    cancelReason: data.cancelReason || '',
    cancelNote: data.cancelNote || '',
    isEdited: Boolean(data.isEdited),
    editHistory: Array.isArray(data.editHistory)
      ? data.editHistory.map((e) => ({
          editedBy: e.editedBy ? deterministicObjectId(e.editedBy) : null,
          editedAt: toDate(e.editedAt) || new Date(),
          changedFields: Array.isArray(e.changedFields) ? e.changedFields : [],
        }))
      : [],
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 5. Donations
  const donationDocs = fsDonations.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    donor: deterministicObjectId(data.donor),
    donorProfile: data.donorProfile ? deterministicObjectId(data.donorProfile) : null,
    request: deterministicObjectId(data.request),
    unitsDonated: Number(data.unitsDonated || 1),
    status: data.status || 'pledged',
    hospitalName: data.hospitalName ?? null,
    donationDate: toDate(data.donationDate) || toDate(data.createdAt) || new Date(),
    completedAt: toDate(data.completedAt) || (data.status === 'completed' ? toDate(data.updatedAt) : null),
    fulfilledAt: toDate(data.fulfilledAt),
    fulfilledBy: data.fulfilledBy ? deterministicObjectId(data.fulfilledBy) : null,
    cancelledAt: toDate(data.cancelledAt),
    releasedAt: toDate(data.releasedAt),
    releasedReason: data.releasedReason ?? null,
    releaseReason: data.releaseReason ?? null,
    notes: data.notes || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 6. InventoryTransactions
  const invTxDocs = fsInvTx.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    hospital: deterministicObjectId(data.hospital),
    bloodGroup: data.bloodGroup,
    change: Number(data.change),
    reason: data.reason || 'manual_adjustment',
    request: data.request ? deterministicObjectId(data.request) : null,
    donor: data.donor ? deterministicObjectId(data.donor) : null,
    actor: data.actor ? deterministicObjectId(data.actor) : null,
    notes: data.notes || '',
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 7. DonorRequestPings
  const pingDocs = fsPings.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    requestId: deterministicObjectId(data.requestId),
    donorId: deterministicObjectId(data.donorId),
    hospitalId: deterministicObjectId(data.hospitalId),
    status: data.status || 'pending',
    sentAt: toDate(data.sentAt) || toDate(data.createdAt) || new Date(),
    respondedAt: toDate(data.respondedAt),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 8. Notifications
  const notifDocs = fsNotifications.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    recipient: deterministicObjectId(data.recipient),
    title: data.title || '',
    message: data.message || '',
    type: data.type || 'general',
    isRead: Boolean(data.isRead),
    link: data.link || '',
    expiresAt: toDate(data.expiresAt) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 9. AIInsights
  const aiInsightDocs = fsAiInsights.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    title: data.title || 'Emergency Donor Network Analysis',
    summary: data.summary || '',
    metrics: convertValueDeep(data.metrics || {}),
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    rawResponse: data.rawResponse || '',
    generatedAt: toDate(data.generatedAt) || toDate(data.createdAt) || new Date(),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 10. LoginLogs
  const loginLogDocs = fsLoginLogs.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    userId: data.userId ? deterministicObjectId(data.userId) : null,
    email: String(data.email || '').toLowerCase().trim(),
    ip: data.ip || '',
    userAgent: data.userAgent || '',
    loginAt: toDate(data.loginAt) || toDate(data.createdAt) || new Date(),
    expiresAt: toDate(data.expiresAt) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  // 11. AuditLogs
  const auditLogDocs = fsAuditLogs.map(({ id, data }) => ({
    _id: deterministicObjectId(id),
    action: data.action || 'unknown',
    targetId: data.targetId ? String(deterministicObjectId(data.targetId)) : null,
    targetType: data.targetType || 'BloodRequest',
    actor: data.actor ? String(deterministicObjectId(data.actor)) : null,
    actorRole: data.actorRole || 'user',
    hospitalId: data.hospitalId ? String(deterministicObjectId(data.hospitalId)) : null,
    reasonCode: data.reasonCode || '',
    note: data.note || '',
    changedFields: Array.isArray(data.changedFields) ? data.changedFields : [],
    metadata: convertValueDeep(data.metadata || {}),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  }));

  const results = {
    users: await validatedInsert(models.User, usersDocs),
    hospitals: await validatedInsert(models.Hospital, hospitalsDocs),
    donorprofiles: await validatedInsert(models.DonorProfile, donorProfileDocs),
    bloodrequests: await validatedInsert(models.BloodRequest, bloodRequestDocs),
    donations: await validatedInsert(models.Donation, donationDocs),
    inventorytransactions: await validatedInsert(models.InventoryTransaction, invTxDocs),
    donorrequestpings: await validatedInsert(models.DonorRequestPing, pingDocs),
    notifications: await validatedInsert(models.Notification, notifDocs),
    aiinsights: await validatedInsert(models.AIInsight, aiInsightDocs),
    loginlogs: await validatedInsert(models.LoginLog, loginLogDocs),
    audit_logs: await validatedInsert(models.AuditLog, auditLogDocs),
  };

  console.log('[Migration] Syncing MongoDB indexes after import...');
  await checkMongoIndexes({ sync: true, quiet: true });

  console.log('[Migration] Completed successfully:');
  for (const [col, count] of Object.entries(results)) {
    console.log(`  - ${col}: ${count} document(s)`);
  }

  await disconnectMongo();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[Migration] Failed:', err);
  try { await disconnectMongo(); } catch (_) {}
  process.exit(1);
});
