/**
 * Migration Script: Migrate targetHospital and normalize unit counts
 *
 * Rules:
 * 1. Requests without targetHospital:
 *    - If an old hospital reference/id/name exists, resolve to targetHospital.
 *    - Otherwise mark status = 'legacy' (admin-only).
 * 2. Requests with shortfall where unitsFromDonors is 0:
 *    - Set unitsFromDonors = Math.max(0, unitsNeeded - unitsFromStock).
 * 3. Safe, idempotent, non-destructive (never deletes records).
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');

async function runMigration() {
  console.log('--- Starting Safe TargetHospital Migration ---');
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not found in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB database');

  const hospitals = await Hospital.find().lean();
  console.log(`Loaded ${hospitals.length} hospitals for reference mapping`);

  const hospitalIdMap = new Map();
  const hospitalNameMap = new Map();
  hospitals.forEach(h => {
    hospitalIdMap.set(h._id.toString(), h._id);
    hospitalNameMap.set(h.name.toLowerCase().trim(), h._id);
  });

  const allRequests = await BloodRequest.find();
  console.log(`Inspecting ${allRequests.length} total blood requests...`);

  const report = {
    total: allRequests.length,
    alreadyValid: 0,
    migratedToTargetHospital: 0,
    markedLegacy: 0,
    shortfallUnitsCorrected: 0,
    details: [],
  };

  for (const req of allRequests) {
    let modified = false;
    const changeLog = [];

    // Check if targetHospital is missing
    if (!req.targetHospital) {
      let resolvedHospId = null;

      // 1. Try old 'hospital' field
      if (req.hospital) {
        const rawHospId = req.hospital.toString();
        if (hospitalIdMap.has(rawHospId)) {
          resolvedHospId = hospitalIdMap.get(rawHospId);
        }
      }

      // 2. Try matching hospital name if text exists
      if (!resolvedHospId && req.hospitalName) {
        const nameKey = req.hospitalName.toLowerCase().trim();
        if (hospitalNameMap.has(nameKey)) {
          resolvedHospId = hospitalNameMap.get(nameKey);
        }
      }

      if (resolvedHospId) {
        req.targetHospital = resolvedHospId;
        req.hospital = resolvedHospId;
        modified = true;
        report.migratedToTargetHospital++;
        changeLog.push(`Mapped old hospital to targetHospital: ${resolvedHospId}`);
      } else {
        if (req.status !== 'legacy') {
          req.status = 'legacy';
          modified = true;
          report.markedLegacy++;
          changeLog.push(`Marked as 'legacy' (no targetHospital match found)`);
        } else {
          changeLog.push(`Already legacy`);
        }
      }
    } else {
      report.alreadyValid++;
    }

    // Check & correct units shortfall for partially fulfilled / active requests
    const expectedShortfall = Math.max(0, (req.unitsNeeded || 0) - (req.unitsFromStock || 0));
    if (
      ['partially_fulfilled', 'matching', 'open'].includes(req.status) &&
      req.unitsFromDonors === 0 &&
      expectedShortfall > 0
    ) {
      req.unitsFromDonors = expectedShortfall;
      modified = true;
      report.shortfallUnitsCorrected++;
      changeLog.push(`Corrected unitsFromDonors from 0 to ${expectedShortfall} (shortfall)`);
    }

    if (modified) {
      await req.save();
    }

    report.details.push({
      id: req._id.toString(),
      patientName: req.patientName,
      status: req.status,
      targetHospital: req.targetHospital ? req.targetHospital.toString() : null,
      unitsNeeded: req.unitsNeeded,
      unitsFromStock: req.unitsFromStock,
      unitsFromDonors: req.unitsFromDonors,
      changes: changeLog,
    });
  }

  console.log('\n================ MIGRATION REPORT ================');
  console.log(`Total Requests Examined:        ${report.total}`);
  console.log(`Already Had targetHospital:     ${report.alreadyValid}`);
  console.log(`Migrated to targetHospital:     ${report.migratedToTargetHospital}`);
  console.log(`Marked as Legacy (Admin Only):  ${report.markedLegacy}`);
  console.log(`Units Shortfall Corrected:      ${report.shortfallUnitsCorrected}`);
  console.log('==================================================\n');

  console.log('Summary of Changes:');
  report.details
    .filter(d => d.changes.length > 0 && !d.changes.every(c => c === 'Already legacy'))
    .forEach(d => {
      console.log(`- Request [${d.id}] "${d.patientName}": ${d.changes.join('; ')}`);
    });

  await mongoose.disconnect();
  console.log('\nMigration complete. Disconnected safely.');
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error('Migration failed with error:', err);
    process.exit(1);
  });
}

module.exports = runMigration;
