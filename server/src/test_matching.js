const { scoreDonorForRequest, rankDonorsForRequest } = require('./services/matching.service');

console.log('--- Testing Pure Rule-Based Matching Engine ---');

const request = {
  bloodGroup: 'A+',
  location: { coordinates: [77.2090, 28.6139] }, // Connaught Place
};

const candidateDonors = [
  {
    user: { name: 'Donor 1 (Exact Match, Nearby, Available)' },
    bloodGroup: 'A+',
    location: { coordinates: [77.2100, 28.6150] }, // ~0.2 km away
    isAvailable: true,
    lastDonationDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    age: 28,
    healthFlags: ['none'],
  },
  {
    user: { name: 'Donor 2 (Universal O-, Compatible, 12 km away)' },
    bloodGroup: 'O-',
    location: { coordinates: [77.2900, 28.6500] }, // ~12 km away
    isAvailable: true,
    lastDonationDate: null,
    age: 32,
    healthFlags: ['none'],
  },
  {
    user: { name: 'Donor 3 (Incompatible B+)' },
    bloodGroup: 'B+',
    location: { coordinates: [77.2100, 28.6150] },
    isAvailable: true,
    lastDonationDate: null,
    age: 25,
    healthFlags: ['none'],
  },
  {
    user: { name: 'Donor 4 (A+, In 90-day Cooldown)' },
    bloodGroup: 'A+',
    location: { coordinates: [77.2100, 28.6150] },
    isAvailable: true,
    lastDonationDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago (cooldown)
    age: 30,
    healthFlags: ['none'],
  },
];

const ranked = rankDonorsForRequest(request, candidateDonors);

console.log(`Ranked ${ranked.length} valid matches:`);
ranked.forEach((res, i) => {
  console.log(`${i + 1}. ${res.donor.user.name} - Score: ${res.matchScore}/100 | Dist: ${res.distanceKm}km`);
  console.log(`   Breakdown:`, res.breakdown);
  console.log(`   Rationale:`, res.rationale.join('; '));
});

// Incompatible (B+) and in-cooldown (A+ 20 days ago) donors must be strictly filtered out.
if (
  ranked.length === 2 &&
  ranked[0].donor.user.name.includes('Donor 1') &&
  ranked[1].donor.user.name.includes('Donor 2')
) {
  console.log('✅ Matching Engine Assertion Passed! (Incompatible and in-cooldown donors successfully excluded)');
} else {
  console.error('❌ Matching Engine Test Failed');
  process.exit(1);
}
