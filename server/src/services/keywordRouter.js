const { buildAction } = require('../config/aiNavigation');
const aiTools = require('./aiTools');

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

// Single-word recognized greetings (whole-word only)
const GREETING_WORDS = new Set([
  'hi',
  'hello',
  'hey',
  'yo',
  'yoo',
  'sup',
  'thanks',
  'thank',
  'thx',
  'ok',
  'okay',
]);

// Multi-word recognized greeting phrases (up to 4 words)
const GREETING_PHRASES = new Set([
  'thank you',
  'thank u',
  'thanks a lot',
  'thank you so much',
  'thank you very much',
  'hey there',
  'hello there',
  'good morning',
  'good afternoon',
  'good evening',
  'ok thanks',
  'okay thanks',
]);

/**
 * Check if the input is a recognized greeting/thanks.
 * Enforces: Whole-word, case-insensitive, messages of 4 words or fewer only.
 * No substring matching ("hi" inside "this"/"which").
 */
function isGreeting(message) {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  if (!trimmed) return false;

  const rawWords = trimmed.split(/\s+/);
  if (rawWords.length > 4) return false;

  // Clean each word by stripping leading and trailing punctuation
  const cleanWords = rawWords
    .map((w) => w.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter(Boolean);

  if (cleanWords.length === 0) return false;

  const phrase = cleanWords.join(' ');
  if (GREETING_PHRASES.has(phrase)) return true;

  if (cleanWords.length === 1 && GREETING_WORDS.has(cleanWords[0])) {
    return true;
  }

  // 2-word variations starting with a greeting word
  if (cleanWords.length === 2 && GREETING_WORDS.has(cleanWords[0])) {
    const secondWord = cleanWords[1];
    const allowedSecond = ['there', 'team', 'lifelink', 'bot', 'assistant', 'everyone', 'all', 'you', 'u', 'thanks'];
    if (allowedSecond.includes(secondWord)) {
      return true;
    }
  }

  return false;
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
  /\b(cricket|football|messi|ronaldo|ipl|nba|world cup|fifa|basketball|tennis|virat|kohli|dhoni|rohit)\b/i,
  /\b(president|election|biden|trump|modi|politics|parliament|congress|minister)\b/i,
  /\b(calculate|math|calculus|integral|derivative|algebra|\d+\s*[\+\-\*\/]\s*\d+)\b/i,
  /\b(python|javascript|typescript|c\+\+|java\b|react\b|node\b|html\b|css\b|write\s+code|debug\s+code|programming)\b/i,
  /\b(recipe|cook|bake|pasta|pizza|cake|cookie|dinner)\b/i,
  /\b(movie|cinema|netflix|actor|hollywood|bollywood|song|lyrics|singer|taylor swift|birthday)\b/i,
  /\b(joke|funny|riddle)\b/i,
  /\b(stock market|crypto|bitcoin|ethereum|forex)\b/i,
];

/**
 * LifeLink term allow-list.
 * If a message has no tool intent and contains none of these terms, it is refused as off-topic.
 */
const LIFELINK_TERMS = [
  /\bblood\b/i,
  /\bdonor(s)?\b/i,
  /\bdonat(e|es|ed|ing|ion|ions)\b/i,
  /\brequest(s)?\b/i,
  /\binventory\b/i,
  /\bstock(s)?\b/i,
  /\bunit(s)?\b/i,
  /\bhospital(s)?\b/i,
  /\bblood\s*bank(s)?\b/i,
  /\bclinic(s)?\b/i,
  /\bpledg(e|es|ed|ing)\b/i,
  /\beligib(le|ility)\b/i,
  /\bcooldown\b/i,
  /\bstandby\b/i,
  /\b(a|b|ab|o)[+-]\b/i,
  /\b(a|b|ab|o)\s+(positive|negative)\b/i,
  // Navigation tabs and router targets
  /\boverview\b/i,
  /\bincoming\b/i,
  /\bactive\b/i,
  /\bmatching\b/i,
  /\bping(s)?\b/i,
  /\bfor\s+you\b/i,
  /\bprofile\b/i,
  /\bhealth\b/i,
  /\bhistory\b/i,
  /\balert(s)?\b/i,
  /\bnotification(s)?\b/i,
  /\bcamp(s)?\b/i,
  /\banalytics\b/i,
  /\binsight(s)?\b/i,
  /\bemergency\b/i,
  /\bpatient(s)?\b/i,
  /\bfind\s+donor(s)?\b/i,
  /\b(where\s+is|how\s+(do\s+i|to)|take\s+me\s+to|navigate|guide)\b/i,
];

function hasLifeLinkTerm(message) {
  if (!message || typeof message !== 'string') return false;
  return LIFELINK_TERMS.some((regex) => regex.test(message));
}

const FIXED_REFUSAL = 'I can only help with LifeLink: blood requests, donors, inventory and finding your way around the app.';

function isOffTopic(message) {
  if (!message) return false;
  return OUT_OF_SCOPE_PATTERNS.some((regex) => regex.test(message));
}

function handleOffTopic(userContext = {}, options = {}) {
  const role = userContext.role || 'public';
  const response = {
    reply: FIXED_REFUSAL,
    actions: [],
    suggestions: getSuggestionsForRole(role),
    provider: 'keyword',
  };
  if (options.fallbackReason) {
    response.fallbackReason = options.fallbackReason;
  }
  return response;
}

/**
 * Provider A: Rule and keyword router for LifeLink queries.
 */
async function routeWithKeywords(message, userContext = {}, options = {}) {
  const lower = (message || '').toLowerCase().trim();
  const role = userContext.role || 'public';
  const isDonorUser = ['user', 'donor', 'individual', 'recipient'].includes(role);
  const isHospital = role === 'hospital';
  const isAdmin = role === 'admin';
  const suggestions = getSuggestionsForRole(role);
  const fallbackReason = options.fallbackReason || null;

  // 1. Off-topic check (explicit non-LifeLink keywords)
  if (isOffTopic(lower)) {
    return handleOffTopic(userContext, options);
  }

  // 2. Greeting check
  if (isGreeting(lower)) {
    const greetingRes = handleGreeting(userContext);
    if (fallbackReason) greetingRes.fallbackReason = fallbackReason;
    return greetingRes;
  }

  // 3. LifeLink Term Allow-list Check
  // If the message contains no LifeLink term and is not a known navigation query, refuse immediately.
  if (!hasLifeLinkTerm(lower)) {
    return handleOffTopic(userContext, options);
  }

  // 4. User / Donor specific keywords
  if (isDonorUser) {
    if (lower.includes('eligible') || lower.includes('cooldown') || lower.includes('can i donate')) {
      const data = await aiTools.executeTool('getEligibility', {}, userContext);
      const reply = `Eligible to donate: ${data.isEligible ? 'Yes' : 'No'}. Next eligible date: ${data.nextEligibleDate || 'Eligible today'}. Days remaining: ${data.daysLeft}. ${data.rationale}`;
      const action = buildAction('donor-profile');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (
      lower.includes('requests for me') ||
      lower.includes('open requests') ||
      lower.includes('matching requests') ||
      lower.includes('compatible') ||
      lower.includes('find requests') ||
      lower.includes('requests matching') ||
      lower.includes('blood group') ||
      lower.includes('who needs') ||
      lower.includes('how many') ||
      lower.includes('compatible donors') ||
      lower.includes('nearest request')
    ) {
      const data = await aiTools.executeTool('getOpenRequestsForMe', {}, userContext);
      const bg = data.donorBloodGroup || '';
      const count = data.totalMatchingRequests || 0;
      let reply = '';
      if (count === 0) {
        reply = `No open requests match your blood group (${bg}) right now. Check back soon.`;
      } else if (count === 1) {
        const top = data.requests[0];
        reply = `1 patient is waiting for your blood type. ${bg} — ${top.unitsNeeded} unit(s) needed at ${top.hospitalName} (urgency: ${top.urgency}, ${top.distanceKm} km away).`;
      } else {
        const top = data.requests[0];
        reply = `${count} patients are waiting for your blood type (${bg}). Most urgent: ${top.unitsNeeded} unit(s) at ${top.hospitalName} (urgency: ${top.urgency}, ${top.distanceKm} km away).`;
      }
      const action = buildAction('donor-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('history') || lower.includes('past donation') || lower.includes('pledges')) {
      const data = await aiTools.executeTool('getMyDonationHistory', {}, userContext);
      const reply = `You have completed ${data.completedDonations} donation(s) out of ${data.totalDonations} total pledge(s) recorded.`;
      const action = buildAction('donor-history');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('my request') || lower.includes('requests created')) {
      const data = await aiTools.executeTool('getMyRequests', {}, userContext);
      const reply = `You have submitted ${data.totalRequests} emergency blood request(s).`;
      const action = buildAction('individual-create-request');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('alert') || lower.includes('notification')) {
      const data = await aiTools.executeTool('getMyAlerts', {}, userContext);
      const reply = `You have ${data.unreadCount} unread alert(s).`;
      const action = buildAction('donor-alerts');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('profile') || lower.includes('standby') || lower.includes('online') || lower.includes('availability')) {
      const data = await aiTools.executeTool('getMyProfile', {}, userContext);
      const reply = `Donor Profile: ${data.name}. Blood Group: ${data.bloodGroup} (${data.bloodGroupConfirmed ? 'Confirmed' : 'Unconfirmed'}). Standby Status: ${data.isAvailable ? 'ONLINE' : 'OFFLINE'}.`;
      const action = buildAction('donor-profile');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }
  }

  // 5. Hospital specific keywords
  if (isHospital) {
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('units') || lower.includes('reserves')) {
      const data = await aiTools.executeTool('getInventory', {}, userContext);
      if (data.error) {
        return { reply: data.error, actions: [], suggestions, provider: 'keyword', fallbackReason };
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
        fallbackReason,
      };
    }

    if (lower.includes('demand') || lower.includes('incoming')) {
      const data = await aiTools.executeTool('getIncomingDemands', {}, userContext);
      const reply = `You have ${data.pendingDemandsCount} incoming emergency demand(s) awaiting hospital review.`;
      const action = buildAction('hospital-demands');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('active request') || lower.includes('broadcast')) {
      const data = await aiTools.executeTool('getActiveRequests', {}, userContext);
      let reply = '';
      if (data.status === 'unverified') {
        reply = data.message;
      } else if (data.totalActive === 0) {
        reply = `0 active requests. Your hospital has not broadcast any open blood requests to community donors right now.`;
      } else {
        const topList = (data.activeRequests || []).slice(0, 2).map(r =>
          `${r.bloodGroup} (${r.unitsNeeded} unit(s), urgency: ${r.urgency})`
        ).join('; ');
        reply = `Your hospital has ${data.totalActive} active emergency blood request(s) broadcast to community donors${topList ? ': ' + topList : ''}.`;
      }
      const action = data.totalActive === 0
        ? buildAction('hospital-create-request')
        : buildAction('hospital-active-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('pledge') || lower.includes('pending pledges')) {
      const data = await aiTools.executeTool('getPendingPledges', {}, userContext);
      const reply = `There are ${data.pendingPledgesCount} pending donor pledge(s) awaiting intake and verification.`;
      const action = buildAction('hospital-active-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('verification') || lower.includes('verified') || lower.includes('approval')) {
      const data = await aiTools.executeTool('getMyVerificationStatus', {}, userContext);
      const reply = `Hospital verification status for ${data.hospitalName}: ${data.statusText}. Address: ${data.address}.`;
      const action = buildAction('hospital-overview');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }
  }

  // 6. Admin specific keywords
  if (isAdmin) {
    if (lower.includes('stat') || lower.includes('analytics') || lower.includes('summary') || lower.includes('metric')) {
      const data = await aiTools.executeTool('getPlatformStats', {}, userContext);
      const reply = `Platform Summary: ${data.totalDonors} registered donors (${data.availableDonors} on standby). ${data.totalRequests} total requests (${data.fulfilledRequests} fulfilled, ${data.openRequests} open). Fulfillment rate: ${data.fulfillmentRate}.`;
      const action = buildAction('admin-analytics');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('pending') || lower.includes('approve hospital') || lower.includes('unverified hospital')) {
      const data = await aiTools.executeTool('getPendingHospitals', {}, userContext);
      const reply = `There are ${data.pendingCount} partner hospital(s) pending administrator approval.`;
      const action = buildAction('admin-users');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('shortage') || lower.includes('insight') || lower.includes('alert')) {
      const data = await aiTools.executeTool('getShortageAlerts', {}, userContext);
      const groups = data.highRiskBloodGroups.length > 0 ? data.highRiskBloodGroups.join(', ') : 'None';
      const reply = `Shortage alerts: High-risk blood groups: ${groups}. ${data.summary}`;
      const action = buildAction('admin-ai-insights');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    if (lower.includes('request master') || lower.includes('all requests')) {
      const data = await aiTools.executeTool('getRequestOverview', {}, userContext);
      const reply = `Request Overview: ${data.totalRequests} total requests recorded, ${data.activeRequestsCount} currently active.`;
      const action = buildAction('admin-requests');
      return {
        reply,
        actions: action ? [action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }
  }

  // 7. Navigation / "Where is..." lookup
  const guide = await aiTools.executeTool('getHowToGuide', { topic: lower }, userContext);
  if (guide.found) {
    return {
      reply: `${guide.description} You can find this under ${guide.title}.`,
      actions: guide.action ? [guide.action] : [],
      suggestions,
      provider: 'keyword',
      fallbackReason,
    };
  }

  // 8. If no specific intent matched, return the fixed refusal
  return handleOffTopic(userContext, options);
}

module.exports = {
  isGreeting,
  handleGreeting,
  isOffTopic,
  hasLifeLinkTerm,
  handleOffTopic,
  routeWithKeywords,
  getSuggestionsForRole,
  FIXED_REFUSAL,
};
