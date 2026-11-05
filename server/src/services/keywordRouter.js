const { buildAction } = require('../config/aiNavigation');
const { executeTool } = require('./aiTools');

const ROLE_SUGGESTIONS = {
  donor: [
    'Check my eligibility',
    'Find requests matching my blood group',
    'View my donation history',
  ],
  user: [
    'Check my eligibility',
    'Find requests matching my blood group',
    'View my donation history',
  ],
  hospital: [
    'Check blood bank inventory',
    'Review incoming demands',
    'View active blood requests',
  ],
  admin: [
    'Platform summary stats',
    'Check shortage alerts',
    'Review pending hospitals',
  ],
  public: [
    'How do I request emergency blood?',
    'Find available donors & hospitals',
    'How does blood donation work?',
  ],
};

function getSuggestionsForRole(role) {
  const norm = role === 'individual' || role === 'recipient' ? 'donor' : role;
  return ROLE_SUGGESTIONS[norm] || ROLE_SUGGESTIONS.public;
}

const GREETING_REGEX = /^(hi|hello|hey|hiya|greetings|good\s+(morning|afternoon|evening)|thanks(\s+(a\s+lot|very\s+much))?|thank\s+you(\s+(so\s+much|very\s+much))?|thx|help|what\s+can\s+you\s+do)[\s!.,?]*$/i;

/**
 * Check if the input is a simple greeting, thank you, or general help query.
 */
function isGreeting(message) {
  if (!message) return false;
  return GREETING_REGEX.test(message.trim());
}

/**
 * Build immediate greeting response based on role without touching LLM or DB.
 */
function handleGreeting(userContext = {}) {
  const role = userContext.role || 'public';
  const name = userContext.name || '';
  const suggestions = getSuggestionsForRole(role);

  let reply = '';
  if (role === 'hospital') {
    reply = `Welcome to LifeLink Hospital Support${name ? `, ${name}` : ''}. How can I assist with your blood bank reserves or emergency demands?`;
  } else if (role === 'admin') {
    reply = `Welcome Admin${name ? `, ${name}` : ''}. How can I assist with platform oversight and emergency network operations?`;
  } else if (['donor', 'user', 'individual', 'recipient'].includes(role)) {
    reply = `Hello${name ? ` ${name}` : ''}! I'm your LifeLink Assistant. How can I help you today with your blood donations or requests?`;
  } else {
    reply = `Welcome to LifeLink! How can I assist you with finding donors, locating hospitals, or requesting blood?`;
  }

  return {
    reply,
    actions: [],
    suggestions,
    provider: 'keyword',
  };
}

/**
 * Patterns that identify clearly out-of-scope non-LifeLink requests.
 */
const OUT_OF_SCOPE_PATTERNS = [
  /\b(weather|forecast|rain|temperature|sunny|cloudy)\b/i,
  /\b(cricket|football|messi|ronaldo|ipl|nba|world cup|fifa|basketball|tennis)\b/i,
  /\b(president|election|biden|trump|modi|politics|parliament|congress|minister)\b/i,
  /\b(calculate|math|calculus|integral|derivative|algebra|\d+\s*[\+\-\*\/]\s*\d+)\b/i,
  /\b(python|javascript|typescript|c\+\+|java\b|react\b|node\b|html\b|css\b|write\s+code|debug\s+code|programming)\b/i,
  /\b(recipe|cook|bake|pasta|pizza|cake|cookie|dinner)\b/i,
  /\b(movie|cinema|netflix|actor|hollywood|bollywood|song|lyrics|singer|taylor swift)\b/i,
  /\b(joke|funny|riddle)\b/i,
  /\b(stock market|crypto|bitcoin|ethereum|forex)\b/i,
];

const FIXED_REFUSAL = 'I can only help with LifeLink: blood requests, donors, inventory and finding your way around the app.';

function isOffTopic(message) {
  if (!message) return false;
  return OUT_OF_SCOPE_PATTERNS.some((regex) => regex.test(message));
}

function handleOffTopic(userContext = {}) {
  const role = userContext.role || 'public';
  return {
    reply: FIXED_REFUSAL,
    actions: [],
    suggestions: getSuggestionsForRole(role),
    provider: 'keyword',
  };
}

/**
 * Provider A: Rule and keyword router for LifeLink queries.
 */
async function routeWithKeywords(message, userContext = {}) {
  const lower = (message || '').toLowerCase().trim();
  const role = userContext.role || 'public';
  const isDonorUser = ['user', 'donor', 'individual', 'recipient'].includes(role);
  const isHospital = role === 'hospital';
  const isAdmin = role === 'admin';
  const suggestions = getSuggestionsForRole(role);

  // 1. Off-topic check
  if (isOffTopic(lower)) {
    return handleOffTopic(userContext);
  }

  // 2. Greeting check
  if (isGreeting(lower)) {
    return handleGreeting(userContext);
  }

  // 3. User / Donor specific keywords
  if (isDonorUser) {
    if (lower.includes('eligible') || lower.includes('cooldown') || lower.includes('can i donate')) {
      const data = await executeTool('getEligibility', {}, userContext);
      const reply = `Eligible to donate: ${data.isEligible ? 'Yes' : 'No'}. Next eligible date: ${data.nextEligibleDate || 'Eligible today'}. Days remaining: ${data.daysLeft}. ${data.rationale}`;
      const action = buildAction('donor-profile');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (
      lower.includes('requests for me') ||
      lower.includes('open requests') ||
      lower.includes('matching requests') ||
      lower.includes('compatible')
    ) {
      const data = await executeTool('getOpenRequestsForMe', {}, userContext);
      let reply = `Found ${data.totalMatchingRequests} matching request(s) for your blood group (${data.donorBloodGroup}).`;
      if (data.requests && data.requests.length > 0) {
        const top = data.requests[0];
        reply += ` Nearest: ${top.patientName} (${top.bloodGroup}) at ${top.hospitalName}, ${top.distanceKm} km away.`;
      }
      const action = buildAction('donor-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('history') || lower.includes('past donation') || lower.includes('pledges')) {
      const data = await executeTool('getMyDonationHistory', {}, userContext);
      const reply = `You have completed ${data.completedDonations} donation(s) out of ${data.totalDonations} total pledge(s) recorded.`;
      const action = buildAction('donor-history');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('my request') || lower.includes('requests created')) {
      const data = await executeTool('getMyRequests', {}, userContext);
      const reply = `You have submitted ${data.totalRequests} emergency blood request(s).`;
      const action = buildAction('individual-create-request');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('alert') || lower.includes('notification')) {
      const data = await executeTool('getMyAlerts', {}, userContext);
      const reply = `You have ${data.unreadCount} unread alert(s).`;
      const action = buildAction('donor-alerts');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('profile') || lower.includes('standby') || lower.includes('online') || lower.includes('availability')) {
      const data = await executeTool('getMyProfile', {}, userContext);
      const reply = `Donor Profile: ${data.name}. Blood Group: ${data.bloodGroup} (${data.bloodGroupConfirmed ? 'Confirmed' : 'Unconfirmed'}). Standby Status: ${data.isAvailable ? 'ONLINE' : 'OFFLINE'}.`;
      const action = buildAction('donor-profile');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }
  }

  // 4. Hospital specific keywords
  if (isHospital) {
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('units') || lower.includes('reserves')) {
      const data = await executeTool('getInventory', {}, userContext);
      if (data.error) {
        return { reply: data.error, actions: [], suggestions, provider: 'keyword' };
      }
      const crit = data.criticalGroups.length > 0 ? data.criticalGroups.join(', ') : 'None';
      const low = data.lowStockGroups.length > 0 ? data.lowStockGroups.join(', ') : 'None';
      const reply = `Total stock: ${data.totalUnits} units. Critical (0 units): ${crit}. Low (1-3 units): ${low}.`;
      const action = buildAction('hospital-inventory');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('demand') || lower.includes('incoming')) {
      const data = await executeTool('getIncomingDemands', {}, userContext);
      const reply = `You have ${data.pendingDemandsCount} incoming emergency demand(s) awaiting hospital review.`;
      const action = buildAction('hospital-demands');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('active request') || lower.includes('broadcast')) {
      const data = await executeTool('getActiveRequests', {}, userContext);
      let reply = '';
      if (data.status === 'unverified') {
        reply = data.message;
      } else {
        reply = `Your hospital has ${data.totalActive} active emergency blood request(s) broadcast to community donors.`;
      }
      const action = buildAction('hospital-active-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('pledge') || lower.includes('pending pledges')) {
      const data = await executeTool('getPendingPledges', {}, userContext);
      const reply = `There are ${data.pendingPledgesCount} pending donor pledge(s) awaiting intake and verification.`;
      const action = buildAction('hospital-active-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('verification') || lower.includes('verified') || lower.includes('approval')) {
      const data = await executeTool('getMyVerificationStatus', {}, userContext);
      const reply = `Hospital verification status for ${data.hospitalName}: ${data.statusText}. Address: ${data.address}.`;
      const action = buildAction('hospital-overview');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }
  }

  // 5. Admin specific keywords
  if (isAdmin) {
    if (lower.includes('stat') || lower.includes('analytics') || lower.includes('summary') || lower.includes('metric')) {
      const data = await executeTool('getPlatformStats', {}, userContext);
      const reply = `Platform Summary: ${data.totalDonors} registered donors (${data.availableDonors} on standby). ${data.totalRequests} total requests (${data.fulfilledRequests} fulfilled, ${data.openRequests} open). Fulfillment rate: ${data.fulfillmentRate}.`;
      const action = buildAction('admin-analytics');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('pending') || lower.includes('approve hospital') || lower.includes('unverified hospital')) {
      const data = await executeTool('getPendingHospitals', {}, userContext);
      const reply = `There are ${data.pendingCount} partner hospital(s) pending administrator approval.`;
      const action = buildAction('admin-users');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('shortage') || lower.includes('insight') || lower.includes('alert')) {
      const data = await executeTool('getShortageAlerts', {}, userContext);
      const groups = data.highRiskBloodGroups.length > 0 ? data.highRiskBloodGroups.join(', ') : 'None';
      const reply = `Shortage alerts: High-risk blood groups: ${groups}. ${data.summary}`;
      const action = buildAction('admin-ai-insights');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }

    if (lower.includes('request master') || lower.includes('all requests')) {
      const data = await executeTool('getRequestOverview', {}, userContext);
      const reply = `Request Overview: ${data.totalRequests} total requests recorded, ${data.activeRequestsCount} currently active.`;
      const action = buildAction('admin-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
      };
    }
  }

  // 6. Navigation / "Where is..." lookup
  const guide = await executeTool('getHowToGuide', { topic: lower }, userContext);
  if (guide.found) {
    return {
      reply: `${guide.description} You can find this under ${guide.title}.`,
      actions: guide.action ? [guide.action] : [],
      suggestions,
      provider: 'keyword',
    };
  }

  // 7. General LifeLink Fallback for unrecognized keywords
  return {
    reply: `I can assist you with emergency blood requests, donor eligibility, inventory stock, and platform navigation. What would you like to check?`,
    actions: [],
    suggestions,
    provider: 'keyword',
  };
}

module.exports = {
  isGreeting,
  handleGreeting,
  isOffTopic,
  handleOffTopic,
  routeWithKeywords,
  getSuggestionsForRole,
  FIXED_REFUSAL,
};
