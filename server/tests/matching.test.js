/**
 * tests/matching.test.js
 *
 * Donor matching suite (pure-function tests — no HTTP):
 *   - AB+ patient matches donors from ALL 8 blood groups
 *   - O-  patient only matches O- donors
 *   - Donors inside the 90-day cooldown window are excluded
 *   - Available flag is respected
 *   - Ranking tier order: exact > O-universal > other compatible
 */

require('./setup');

const {
  BLOOD_GROUPS,
  canDonate,
} = require('../src/utils/bloodCompatibility');

const {
  isDonorCandidate,
  rankDonorsForRequest,
  COOLDOWN_DAYS,
} = require('../src/services/matching.service');

// ── Helper: create a minimal mock donor ──────────────────────────────────────

const makeDonor = (bloodGroup, overrides = {}) => ({
  bloodGroup,
  isAvailable: true,
  lastDonationDate: null,
  healthFlags: ['none'],
  location: { type: 'Point', coordinates: [77.209, 28.614] },
  ...overrides,
});

// ── Helper: create a minimal mock request ────────────────────────────────────

const makeRequest = (bloodGroup, overrides = {}) => ({
  bloodGroup,
  location: { type: 'Point', coordinates: [77.209, 28.614] },
  ...overrides,
});

// ── 1. AB+ patient matches all 8 donor groups ─────────────────────────────────

describe('AB+ patient receives from all 8 blood groups', () => {
  const request = makeRequest('AB+');

  for (const donorGroup of BLOOD_GROUPS) {
    test(`Donor ${donorGroup} → AB+ patient: should be a candidate`, () => {
      const donor = makeDonor(donorGroup);
      const result = isDonorCandidate(request, donor);
      expect(result.isCandidate).toBe(true);
    });
  }

  test('rankDonorsForRequest returns all 8 donors for AB+ patient', () => {
    const donors = BLOOD_GROUPS.map(g => makeDonor(g));
    const ranked = rankDonorsForRequest(request, donors);
    expect(ranked).toHaveLength(8);
  });
});

// ── 2. O- patient ONLY matches O- donors ────────────────────────────────────

describe('O- patient only receives from O- donors', () => {
  const request = makeRequest('O-');

  for (const donorGroup of BLOOD_GROUPS) {
    const shouldMatch = donorGroup === 'O-';
    test(`Donor ${donorGroup} → O- patient: isCandidate should be ${shouldMatch}`, () => {
      const donor = makeDonor(donorGroup);
      const result = isDonorCandidate(request, donor);
      expect(result.isCandidate).toBe(shouldMatch);
    });
  }

  test('rankDonorsForRequest returns only 1 donor for O- patient', () => {
    const donors = BLOOD_GROUPS.map(g => makeDonor(g));
    const ranked = rankDonorsForRequest(request, donors);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].donor.bloodGroup).toBe('O-');
  });
});

// ── 3. 90-day cooldown rule ───────────────────────────────────────────────────

describe('90-day cooldown window', () => {
  const request = makeRequest('O+');

  test('donor who donated 89 days ago is excluded', () => {
    const lastDate = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);
    const donor = makeDonor('O+', { lastDonationDate: lastDate });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(false);
    expect(result.reason).toMatch(/cooldown/i);
  });

  test('donor who donated exactly 90 days ago is eligible', () => {
    const lastDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const donor = makeDonor('O+', { lastDonationDate: lastDate });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(true);
  });

  test('donor who donated 1 day ago is excluded', () => {
    const lastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const donor = makeDonor('O+', { lastDonationDate: lastDate });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(false);
  });

  test('donor with no lastDonationDate is always eligible', () => {
    const donor = makeDonor('O+', { lastDonationDate: null });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(true);
  });

  test('COOLDOWN_DAYS constant equals 90', () => {
    expect(COOLDOWN_DAYS).toBe(90);
  });
});

// ── 4. Unavailable donors excluded ───────────────────────────────────────────

describe('Unavailable donors are excluded', () => {
  const request = makeRequest('A+');

  test('isAvailable=false donor is excluded', () => {
    const donor = makeDonor('A+', { isAvailable: false });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(false);
    expect(result.reason).toMatch(/unavailable/i);
  });

  test('isAvailable=true donor is a candidate', () => {
    const donor = makeDonor('A+', { isAvailable: true });
    const result = isDonorCandidate(request, donor);
    expect(result.isCandidate).toBe(true);
  });
});

// ── 5. Ranking tier order ─────────────────────────────────────────────────────

describe('Donor ranking tier order', () => {
  test('Exact match (A+) ranked before O- universal donor for A+ patient', () => {
    const request = makeRequest('A+');
    const donors = [
      makeDonor('O-'),  // tier 2
      makeDonor('A+'),  // tier 1 (exact)
    ];
    const ranked = rankDonorsForRequest(request, donors);
    expect(ranked[0].donor.bloodGroup).toBe('A+');
    expect(ranked[0].matchTier).toBe(1);
    expect(ranked[1].matchTier).toBe(2);
  });
});
