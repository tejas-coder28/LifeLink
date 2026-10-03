/**
 * tests/bloodCompatibility.test.js
 *
 * Exhaustive unit tests for the blood compatibility utility.
 * Tests all 64 donor × patient combinations against the authoritative
 * truth table. No HTTP calls — pure unit tests.
 */

require('./setup');

const {
  BLOOD_GROUPS,
  canDonate,
  compatibleDonorGroups,
  compatibleRecipientGroups,
  DONOR_CAN_GIVE_TO,
} = require('../src/utils/bloodCompatibility');

// ── Ground-truth table (from the task spec / ABO-Rh standard) ────────────────
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

// ── 1. All 64 donor × patient combinations ────────────────────────────────────

describe('canDonate() — all 64 donor × patient combinations', () => {
  for (const donor of BLOOD_GROUPS) {
    for (const patient of BLOOD_GROUPS) {
      const shouldDonate = EXPECTED[donor].has(patient);
      test(`${donor} → ${patient} : should be ${shouldDonate}`, () => {
        expect(canDonate(donor, patient)).toBe(shouldDonate);
      });
    }
  }
});

// ── 2. compatibleDonorGroups(patientGroup) ────────────────────────────────────

describe('compatibleDonorGroups() — derived inverse table', () => {
  for (const patient of BLOOD_GROUPS) {
    const expectedDonors = BLOOD_GROUPS
      .filter(d => EXPECTED[d].has(patient))
      .sort();

    test(`Patient ${patient} can receive from [${expectedDonors.join(', ')}]`, () => {
      const actual = compatibleDonorGroups(patient).slice().sort();
      expect(actual).toEqual(expectedDonors);
    });
  }
});

// ── 3. compatibleRecipientGroups(donorGroup) ─────────────────────────────────

describe('compatibleRecipientGroups() — donor outbound table', () => {
  for (const donor of BLOOD_GROUPS) {
    const expectedRecipients = [...EXPECTED[donor]].sort();

    test(`Donor ${donor} can give to [${expectedRecipients.join(', ')}]`, () => {
      const actual = compatibleRecipientGroups(donor).slice().sort();
      expect(actual).toEqual(expectedRecipients);
    });
  }
});

// ── 4. Key medical invariants ─────────────────────────────────────────────────

describe('Key medical invariants', () => {
  test('O- is a universal donor (can donate to all 8 groups)', () => {
    for (const patient of BLOOD_GROUPS) {
      expect(canDonate('O-', patient)).toBe(true);
    }
  });

  test('AB+ is a universal recipient (can receive from all 8 groups)', () => {
    for (const donor of BLOOD_GROUPS) {
      expect(canDonate(donor, 'AB+')).toBe(true);
    }
  });

  test('AB+ cannot donate to anyone except AB+', () => {
    for (const patient of BLOOD_GROUPS.filter(g => g !== 'AB+')) {
      expect(canDonate('AB+', patient)).toBe(false);
    }
  });

  test('O+ cannot donate to O-', () => {
    expect(canDonate('O+', 'O-')).toBe(false);
  });

  test('A+ cannot donate to B+', () => {
    expect(canDonate('A+', 'B+')).toBe(false);
  });

  test('A- can donate to A+ (Rh-negative can give to Rh-positive same ABO)', () => {
    expect(canDonate('A-', 'A+')).toBe(true);
  });

  test('canDonate returns false for missing args', () => {
    expect(canDonate(null, 'A+')).toBe(false);
    expect(canDonate('O-', null)).toBe(false);
    expect(canDonate(undefined, undefined)).toBe(false);
  });
});
