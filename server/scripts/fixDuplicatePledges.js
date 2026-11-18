/**
 * One-time script: fixDuplicatePledges.js
 * 
 * Finds donors with multiple 'pledged' donations across requests.
 * Keeps the OLDEST pledge (by createdAt) and releases newer ones with status: 'released'.
 * 
 * Run once: node server/scripts/fixDuplicatePledges.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const connectDB = require('../src/config/db');
const Donation = require('../src/repositories/donation.repository');

async function fixDuplicatePledges() {
  await connectDB();

  console.log('[fixDuplicatePledges] Loading all active pledged donations...');
  const allPledged = await Donation.find({ status: 'pledged' });
  console.log(`[fixDuplicatePledges] Found ${allPledged.length} total active pledge(s).`);

  // Group by donor
  const byDonor = {};
  for (const d of allPledged) {
    const donorId = d.donor?._id ? d.donor._id.toString() : d.donor?.toString();
    if (!donorId) continue;
    if (!byDonor[donorId]) byDonor[donorId] = [];
    byDonor[donorId].push(d);
  }

  let fixCount = 0;
  for (const [donorId, pledges] of Object.entries(byDonor)) {
    if (pledges.length <= 1) continue;

    // Sort ascending by createdAt: oldest first
    pledges.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const oldest = pledges[0];
    const duplicates = pledges.slice(1);

    console.log(`[fixDuplicatePledges] Donor ${donorId} has ${pledges.length} active pledges. Keeping oldest (${oldest._id}), releasing ${duplicates.length} duplicate(s).`);

    for (const dup of duplicates) {
      console.log(`  -> Releasing duplicate pledge ${dup._id} for request ${dup.request?._id || dup.request}`);
      await Donation.findByIdAndUpdate(dup._id, {
        status: 'released',
        releaseReason: 'duplicate_pledge_cleanup',
        updatedAt: new Date(),
      });
      fixCount++;
    }
  }

  console.log(`[fixDuplicatePledges] Cleanup complete. Released ${fixCount} duplicate pledge(s).`);
  process.exit(0);
}

fixDuplicatePledges().catch((err) => {
  console.error('[fixDuplicatePledges] Error:', err.message);
  process.exit(1);
});
