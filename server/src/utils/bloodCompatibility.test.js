/**
 * Blood Compatibility — Exhaustive Unit Test (all 64 donor/patient combinations)
 *
 * Run with:   node server/src/utils/bloodCompatibility.test.js
 *
 * Checks every cell of the RBC compatibility matrix against the
 * authoritative truth table defined in the task description.
 * Exits with code 1 if any assertion fails.
 */

const {
  BLOOD_GROUPS,
  canDonate,
  compatibleDonorGroups,
  compatibleRecipientGroups,
} = require('./bloodCompatibility');

// ── Ground-truth table (directly from the task spec) ─────────────────────────
// donor → set of patients they CAN donate to
const EXPECTED = {
  'O-':  new Set(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']),
  'O+':  new Set(['O+', 'A+', 'B+', 'AB+']),
  'A-':  new Set(['A-', 'A+', 'AB-', 'AB+']),
  'A+':  new Set(['A+', 'AB+']),
  'B-':  new Set(['B-', 'B+', 'AB-', 'AB+']),
  'B+':  new Set(['B+', 'AB+']),
  'AB-': new Set(['AB-', 'AB+']),
  'AB+': new Set(['AB+']),
};

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// ── 1. Test all 64 canDonate(donor, patient) cells ───────────────────────────
console.log('\n[1/4] Testing all 64 donor × patient combinations via canDonate()…');
for (const donor of BLOOD_GROUPS) {
  for (const patient of BLOOD_GROUPS) {
    const shouldDonate = EXPECTED[donor].has(patient);
    const result = canDonate(donor, patient);
    assert(
      result === shouldDonate,
      `canDonate("${donor}", "${patient}") → expected ${shouldDonate}, got ${result}`
    );
  }
}
console.log(`  ${passed} passed, ${failed} failed`);

// ── 2. Test compatibleDonorGroups(patient) ───────────────────────────────────
console.log('\n[2/4] Testing compatibleDonorGroups(patientGroup)…');
let t2p = 0, t2f = 0;
for (const patient of BLOOD_GROUPS) {
  // Who SHOULD be able to donate to this patient?
  const expected = BLOOD_GROUPS.filter(d => EXPECTED[d].has(patient)).sort();
  const actual   = compatibleDonorGroups(patient).slice().sort();
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) { t2p++; } else {
    console.error(`  FAIL compatibleDonorGroups("${patient}"): expected [${expected}], got [${actual}]`);
    t2f++;
  }
}
console.log(`  ${t2p} passed, ${t2f} failed`);

// ── 3. Test compatibleRecipientGroups(donor) ─────────────────────────────────
console.log('\n[3/4] Testing compatibleRecipientGroups(donorGroup)…');
let t3p = 0, t3f = 0;
for (const donor of BLOOD_GROUPS) {
  const expected = [...EXPECTED[donor]].sort();
  const actual   = compatibleRecipientGroups(donor).slice().sort();
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) { t3p++; } else {
    console.error(`  FAIL compatibleRecipientGroups("${donor}"): expected [${expected}], got [${actual}]`);
    t3f++;
  }
}
console.log(`  ${t3p} passed, ${t3f} failed`);

// ── 4. Key medical invariants ─────────────────────────────────────────────────
console.log('\n[4/4] Testing key medical invariants…');
let t4p = 0, t4f = 0;
const inv = [
  // O- is universal donor
  ...BLOOD_GROUPS.map(p => ({ label: `O- → ${p}`, result: canDonate('O-', p), expected: true })),
  // AB+ is universal recipient
  ...BLOOD_GROUPS.map(d => ({ label: `${d} → AB+`, result: canDonate(d, 'AB+'), expected: true })),
  // AB+ cannot donate to anyone except AB+
  ...BLOOD_GROUPS.filter(p => p !== 'AB+').map(p => ({
    label: `AB+ → ${p} must be false`, result: canDonate('AB+', p), expected: false
  })),
  // O+ cannot donate to O-
  { label: 'O+ → O- must be false', result: canDonate('O+', 'O-'), expected: false },
  // A+ cannot donate to B+
  { label: 'A+ → B+ must be false', result: canDonate('A+', 'B+'), expected: false },
];
for (const { label, result, expected } of inv) {
  if (result === expected) { t4p++; } else {
    console.error(`  FAIL (${label}): expected ${expected}, got ${result}`);
    t4f++;
  }
}
console.log(`  ${t4p} passed, ${t4f} failed`);

// ── Summary ───────────────────────────────────────────────────────────────────
const totalFailed = failed + t2f + t3f + t4f;
const totalPassed = passed + t2p + t3p + t4p;
console.log(`\n═══════════════════════════════════════`);
console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
console.log(`═══════════════════════════════════════\n`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✅  All compatibility assertions passed.\n');
}
