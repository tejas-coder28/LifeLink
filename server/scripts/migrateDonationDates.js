/**
 * server/scripts/migrateDonationDates.js
 *
 * One-time idempotent migration script for LifeLink donation date normalization:
 * 1. Ensures every Donation record populates pledgedAt, and fulfilled donations populate
 *    confirmedAt (= completedAt || fulfilledAt) and donatedAt (= confirmedAt when unset).
 * 2. Backfills releasedAt on 'released' pledges when previously unset.
 * 3. Recomputes donor.lastDonationDate = donatedAt of each donor's latest fulfilled donation.
 */

const path = require('path');
const Donation = require('../src/models/Donation');
const DonorProfile = require('../src/models/DonorProfile');
require('../src/models/User');

function sameInstant(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (isNaN(ta) && isNaN(tb)) return true;
  return ta === tb;
}

function isoOrNull(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function migrateDonationDates({ dryRun = false } = {}) {
  const donations = await Donation.find()
    .populate('donor', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  const donationChanges = [];
  const latestByDonor = new Map();

  for (const doc of donations) {
    const isFulfilled = doc.status === 'completed' || doc.status === 'fulfilled';
    const nextPledgedAt = doc.pledgedAt || doc.createdAt || doc.donationDate || new Date();
    const nextConfirmedAt = isFulfilled
      ? (doc.confirmedAt || doc.fulfilledAt || doc.completedAt || doc.updatedAt || null)
      : null;
    const nextDonatedAt = isFulfilled
      ? (doc.donatedAt || nextConfirmedAt)
      : null;
    const nextReleasedAt =
      doc.status === 'released' && !doc.releasedAt
        ? (doc.updatedAt || doc.createdAt || null)
        : doc.releasedAt || null;

    if (isFulfilled && nextDonatedAt) {
      const donorId = (doc.donor?._id || doc.donor)?.toString();
      if (donorId) {
        const curLatest = latestByDonor.get(donorId);
        if (!curLatest || new Date(nextDonatedAt).getTime() > new Date(curLatest).getTime()) {
          latestByDonor.set(donorId, new Date(nextDonatedAt));
        }
      }
    }

    const updates = {};
    if (!sameInstant(doc.pledgedAt, nextPledgedAt)) updates.pledgedAt = nextPledgedAt;
    if (!sameInstant(doc.confirmedAt, nextConfirmedAt)) updates.confirmedAt = nextConfirmedAt;
    if (!sameInstant(doc.donatedAt, nextDonatedAt)) updates.donatedAt = nextDonatedAt;
    if (isFulfilled && nextDonatedAt && !sameInstant(doc.donationDate, nextDonatedAt)) {
      updates.donationDate = nextDonatedAt;
    }
    if (!sameInstant(doc.releasedAt, nextReleasedAt)) updates.releasedAt = nextReleasedAt;

    if (Object.keys(updates).length > 0) {
      const before = {
        pledgedAt: isoOrNull(doc.pledgedAt),
        donatedAt: isoOrNull(doc.donatedAt),
        confirmedAt: isoOrNull(doc.confirmedAt),
        releasedAt: isoOrNull(doc.releasedAt),
        donationDate: isoOrNull(doc.donationDate),
        createdAt: isoOrNull(doc.createdAt),
        completedAt: isoOrNull(doc.completedAt),
        fulfilledAt: isoOrNull(doc.fulfilledAt),
      };

      if (!dryRun) {
        await Donation.updateOne({ _id: doc._id }, { $set: updates });
      }

      const after = {
        pledgedAt: isoOrNull(updates.pledgedAt !== undefined ? updates.pledgedAt : doc.pledgedAt),
        donatedAt: isoOrNull(updates.donatedAt !== undefined ? updates.donatedAt : doc.donatedAt),
        confirmedAt: isoOrNull(updates.confirmedAt !== undefined ? updates.confirmedAt : doc.confirmedAt),
        releasedAt: isoOrNull(updates.releasedAt !== undefined ? updates.releasedAt : doc.releasedAt),
        donationDate: isoOrNull(updates.donationDate !== undefined ? updates.donationDate : doc.donationDate),
      };

      donationChanges.push({
        id: doc._id.toString(),
        donorId: (doc.donor?._id || doc.donor)?.toString() || null,
        donorName: doc.donor?.name || null,
        donorEmail: doc.donor?.email || null,
        status: doc.status,
        before,
        after,
      });
    }
  }

  const profileChanges = [];
  for (const [donorId, latestDonatedAt] of latestByDonor.entries()) {
    const profile = await DonorProfile.findOne({ user: donorId }).populate('user', 'name email');
    if (!profile) continue;

    if (!sameInstant(profile.lastDonationDate, latestDonatedAt)) {
      const beforeLast = isoOrNull(profile.lastDonationDate);
      if (!dryRun) {
        await DonorProfile.updateOne(
          { _id: profile._id },
          { $set: { lastDonationDate: latestDonatedAt } }
        );
      }
      profileChanges.push({
        profileId: profile._id.toString(),
        userId: donorId,
        donorName: profile.user?.name || null,
        donorEmail: profile.user?.email || null,
        before: { lastDonationDate: beforeLast },
        after: { lastDonationDate: isoOrNull(latestDonatedAt) },
      });
    }
  }

  return {
    dryRun,
    donationsChecked: donations.length,
    donationsModified: donationChanges.length,
    profilesChecked: latestByDonor.size,
    profilesModified: profileChanges.length,
    donationChanges,
    profileChanges,
  };
}

if (require.main === module) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  require('dotenv').config();
  const connectDB = require('../src/config/db');
  const { disconnectMongo } = require('../src/config/mongo');

  const dryRun = process.argv.includes('--dry-run');

  (async () => {
    try {
      await connectDB();
      const report = await migrateDonationDates({ dryRun });
      console.log(JSON.stringify(report, null, 2));
      await disconnectMongo();
      process.exit(0);
    } catch (err) {
      console.error('Migration failed:', err.message);
      try {
        await disconnectMongo();
      } catch (_) {}
      process.exit(1);
    }
  })();
}

module.exports = {
  migrateDonationDates,
};
