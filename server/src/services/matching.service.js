const { canDonate, isBloodCompatible, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const { calculateHaversineDistance } = require('../utils/geo');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');

const COOLDOWN_DAYS = DONATION_COOLDOWN_DAYS; // 90-day cooldown between donations (business rule)

/**
 * Checks whether a donor is medically eligible to be a candidate for a blood request.
 * Rule:
 * 1. canDonate(donorGroup, patientGroup) must be true
 * 2. donor must be available (isAvailable !== false)
 * 3. 90+ days have passed since lastDonationDate (or no donation yet)
 */
function isDonorCandidate(request, donor) {
  const reqGroup = request.bloodGroup;
  const donorGroup = donor.bloodGroup;

  // 1. Blood compatibility
  if (!canDonate(donorGroup, reqGroup)) {
    return {
      isCandidate: false,
      reason: `Incompatible blood group (${donorGroup} cannot donate to ${reqGroup})`,
    };
  }

  // 2. Availability
  if (donor.isAvailable === false) {
    return {
      isCandidate: false,
      reason: 'Donor status set to unavailable / offline',
    };
  }

  // 3. 90-day cooldown rule
  let daysSinceLastDonation = null;
  if (donor.lastDonationDate) {
    const lastDate = new Date(donor.lastDonationDate);
    const diffMs = Date.now() - lastDate.getTime();
    daysSinceLastDonation = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysSinceLastDonation < COOLDOWN_DAYS) {
      return {
        isCandidate: false,
        daysSinceLastDonation,
        reason: `Inside 90-day cooldown window (${daysSinceLastDonation} days since last donation, ${COOLDOWN_DAYS - daysSinceLastDonation} day(s) remaining)`,
      };
    }
  }

  return { isCandidate: true, daysSinceLastDonation };
}

/**
 * Match Priority Tier:
 * 1 = Exact match (same blood group)
 * 2 = Universal donor (O-) when patient is not O-
 * 3 = Other compatible blood group
 */
function getMatchTier(donorGroup, patientGroup) {
  if (donorGroup === patientGroup) return 1;
  if (donorGroup === 'O-') return 2;
  return 3;
}

/**
 * Pure function: Calculates match score and rationale for a single candidate donor against a request.
 */
function scoreDonorForRequest(request, donor) {
  const reqGroup = request.bloodGroup;
  const donorGroup = donor.bloodGroup;

  const candidateCheck = isDonorCandidate(request, donor);
  if (!candidateCheck.isCandidate) {
    return {
      donor,
      matchScore: 0,
      isCompatible: false,
      isCandidate: false,
      breakdown: { compatibilityScore: 0, availabilityScore: 0, geoScore: 0, eligibilityScore: 0 },
      rationale: [candidateCheck.reason],
    };
  }

  const tier = getMatchTier(donorGroup, reqGroup);
  let tierLabel = 'Compatible Donor';
  let compatibilityScore = 25;
  if (tier === 1) {
    tierLabel = 'Exact match';
    compatibilityScore = 40;
  } else if (tier === 2) {
    tierLabel = 'Compatible (O- universal)';
    compatibilityScore = 32;
  }

  const reqCoords = request.location?.coordinates || [77.2090, 28.6139];
  const donorCoords = donor.location?.coordinates || [77.2090, 28.6139];
  const distanceKm = calculateHaversineDistance(reqCoords, donorCoords);

  let geoScore = 20;
  if (distanceKm <= 5) geoScore = 35;
  else if (distanceKm <= 15) geoScore = 28;
  else if (distanceKm <= 30) geoScore = 20;
  else if (distanceKm <= 50) geoScore = 12;
  else geoScore = 5;

  const availabilityScore = 15;
  let eligibilityScore = 10;
  const flags = donor.healthFlags || [];
  if (flags.some(f => ['active_infection', 'tattoos_recent', 'underweight', 'hepatitis'].includes(f))) {
    eligibilityScore = 2;
  }

  const totalScore = compatibilityScore + availabilityScore + geoScore + eligibilityScore;

  return {
    donor,
    matchScore: totalScore,
    isCompatible: true,
    isCandidate: true,
    matchTier: tier,
    matchTierLabel: tierLabel,
    distanceKm,
    daysSinceLastDonation: candidateCheck.daysSinceLastDonation,
    breakdown: {
      compatibilityScore,
      availabilityScore,
      geoScore,
      eligibilityScore,
    },
    rationale: [tierLabel, `${distanceKm.toFixed(1)} km away`],
  };
}

/**
 * Pure function: Ranks an array of candidate donors for a given request.
 * Enforces rule:
 * 1. Must be a candidate (compatible, available, 90+ days cooldown)
 * 2. Rank exact matches first (tier 1)
 * 3. Then O- as universal donor (tier 2)
 * 4. Then other compatible groups (tier 3)
 * 5. Then by distance ascending (closest first)
 */
function rankDonorsForRequest(request, candidateDonors) {
  if (!request || !candidateDonors || !Array.isArray(candidateDonors)) {
    return [];
  }

  const scoredDonors = candidateDonors
    .map(donor => scoreDonorForRequest(request, donor))
    .filter(res => res.isCandidate);

  scoredDonors.sort((a, b) => {
    // 1. Priority tier: exact matches (1) > O- universal (2) > other compatible (3)
    if (a.matchTier !== b.matchTier) {
      return a.matchTier - b.matchTier;
    }
    // 2. Tie-breaker within tier: distance ascending (closer first)
    return (a.distanceKm || 0) - (b.distanceKm || 0);
  });

  return scoredDonors;
}

/**
 * Service function: Fetches request and potential candidate donors from DB, scores and returns ranking.
 */
const findMatchesForRequestId = async (requestId, maxResults = 10) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    throw new Error('Blood request not found');
  }

  // Fetch candidate donors
  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');

  const rankedMatches = rankDonorsForRequest(request, candidateDonors);
  return {
    request,
    totalCandidateDonors: candidateDonors.length,
    matchesCount: rankedMatches.length,
    matches: rankedMatches.slice(0, maxResults),
  };
};

module.exports = {
  COOLDOWN_DAYS,
  isDonorCandidate,
  scoreDonorForRequest,
  rankDonorsForRequest,
  findMatchesForRequestId,
};
