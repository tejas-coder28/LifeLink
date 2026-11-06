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
  /\b(poem|poetry|rhyme|haiku|write\s+(me\s+)?a\s+poem)\b/i,
];

/**
 * Normalizes message text:
 * - lowercase, trim
 * - strips punctuation while preserving blood group signs (+ and -)
 * - collapses repeated whitespace
 * - stems simple plurals and inflections (requests -> request, donors -> donor, etc.)
 */
function normalizeMessage(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.toLowerCase().trim();
  // Strip punctuation except blood group markers (+ and -)
  s = s.replace(/[^\w\s\+\-]/g, ' ');
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();

  // Stem common domain words so plural and conjugated forms match data intents
  s = s.replace(/\b(requests|requested)\b/g, 'request');
  s = s.replace(/\bdonors\b/g, 'donor');
  s = s.replace(/\b(donations?|donating)\b/g, 'donate');
  s = s.replace(/\b(pledges|pledged|pledging)\b/g, 'pledge');
  s = s.replace(/\bpatients\b/g, 'patient');
  s = s.replace(/\bunits\b/g, 'unit');
  s = s.replace(/\bhospitals\b/g, 'hospital');
  s = s.replace(/\balerts\b/g, 'alert');
  s = s.replace(/\bnotifications\b/g, 'notification');

  return s;
}

/**
 * LifeLink term allow-list.
 * If a message contains ANY of these terms, it is considered in-scope.
 */
const LIFELINK_TERMS = [
  /\bblood\b/i,
  /\bdonor(s)?\b/i,
  /\bdonat(e|es|ed|ing|ion|ions)\b/i,
  /\brequest(s|ed|ing)?\b/i,
  /\bpatient(s)?\b/i,
  /\bneed(s|ed|ing)?\b/i,
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
  /\bshortage(s)?\b/i,
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
  /\bdemands?\b/i,
  /\breserves?\b/i,
  // Combinations with "any" or "anyone"
  /\b(any|anyone)\s+(waiting|need|request|patient|donor|hospital|blood)\b/i,
  /\b(where\s+is|how\s+(do\s+i|to)|take\s+me\s+to|navigate|guide)\b/i,
];

function hasLifeLinkTerm(message) {
  if (!message || typeof message !== 'string') return false;
  return LIFELINK_TERMS.some((regex) => regex.test(message));
}

const CAPABILITY_PATTERNS = [
  /\bwhat\s+can\s+you\s+do\b/i,
  /\bwhat\s+do\s+you\s+do\b/i,
  /\bhow\s+can\s+you\s+help\b/i,
  /\bwhat\s+can\s+i\s+ask\b/i,
  /\bwhat\s+are\s+your\s+features\b/i,
  /\bhelp\b/i,
  /\bcapabilities\b/i,
  /\bcommands\b/i,
  /\bwho\s+are\s+you\b/i,
  /\bwhat\s+are\s+you\b/i,
];

function isCapabilityQuery(message) {
  if (!message || typeof message !== 'string') return false;
  return CAPABILITY_PATTERNS.some((regex) => regex.test(message));
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
 * Helpful capability reply for in-scope LifeLink messages that do not match a specific data tool.
 * Provides role-scoped guidance and suggestion chips instead of an off-topic refusal.
 */
function handleInScopeHelp(userContext = {}, options = {}) {
  const role = userContext.role || 'public';
  const suggestions = getSuggestionsForRole(role);
  let reply = '';

  if (role === 'hospital') {
    reply = 'I can help you check blood bank inventory reserves, review incoming patient demands, track active emergency requests broadcast to donors, or navigate the hospital command center. Here are some things you can ask:';
  } else if (role === 'admin') {
    reply = 'I can help you review platform stats, inspect blood shortage alerts, approve pending hospitals, manage users, or review system analytics. Here are some things you can ask:';
  } else if (['donor', 'user', 'individual', 'recipient'].includes(role)) {
    reply = 'I can help you check your donation eligibility, find blood requests matching your blood group, view your donation history, check alerts, or navigate the donor portal. Here are some things you can ask:';
  } else {
    reply = 'I can help you find compatible donors, locate nearby hospitals, learn how blood donation works, or request emergency blood. Here are some things you can ask:';
  }

  const response = {
    reply,
    actions: [],
    suggestions,
    provider: 'keyword',
  };
  if (options.fallbackReason) {
    response.fallbackReason = options.fallbackReason;
  }
  return response;
}

/**
 * Provider A: Rule and keyword router for LifeLink queries.
 * Order: greeting -> data intent -> navigation intent -> LifeLink term allow-list -> refuse.
 * Refusal is strictly the LAST resort for non-LifeLink queries.
 */
async function routeWithKeywords(message, userContext = {}, options = {}) {
  const raw = (message || '').trim();
  const lower = raw.toLowerCase();
  const norm = normalizeMessage(raw);

  const role = userContext.role || 'public';
  const isDonorUser = ['user', 'donor', 'individual', 'recipient'].includes(role);
  const isHospital = role === 'hospital';
  const isAdmin = role === 'admin';
  const suggestions = getSuggestionsForRole(role);
  const fallbackReason = options.fallbackReason || null;

  // 1. Greeting check (whole-word, concise greeting)
  if (isGreeting(raw)) {
    const greetingRes = handleGreeting(userContext);
    if (fallbackReason) greetingRes.fallbackReason = fallbackReason;
    return greetingRes;
  }

  // 2. Explicit Navigation question check ("where do I see...", "how do I find...", "take me to...")
  const isExplicitNav = /^(where|how\s+(do|can|to)|take\s+me|show\s+me\s+where|navigate)/i.test(lower);
  if (isExplicitNav) {
    let guide = await aiTools.executeTool('getHowToGuide', { topic: lower }, userContext);
    if (!guide || !guide.found) {
      guide = await aiTools.executeTool('getHowToGuide', { topic: norm }, userContext);
    }
    if (guide && guide.found) {
      return {
        reply: `${guide.description} You can find this under ${guide.title}.`,
        actions: guide.action ? [guide.action] : [],
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }
  }

  // 3. User / Donor data intents
  if (isDonorUser) {
    // 3a. Eligibility / Cooldown
    if (norm.includes('eligible') || norm.includes('cooldown') || norm.includes('can i donate')) {
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

    // 3b. Requests created by the user
    const isCreatedRequestsQuery =
      norm.includes('request i created') ||
      norm.includes('request i made') ||
      norm.includes('request i submitted') ||
      norm.includes('my created request') ||
      norm.includes('submitted request') ||
      norm.includes('requests created');

    if (isCreatedRequestsQuery) {
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

    // 3c. Open requests matching donor (data tool, not navigation)
    // Covers: "is there any request", "any requests", "does anyone need blood",
    // "who needs blood", "any patients", "anyone waiting", "open requests", "requests for me", "my requests"
    const isDonorRequestDataQuery =
      norm.includes('is there any request') ||
      norm.includes('are there any request') ||
      norm.includes('any request') ||
      norm.includes('does anyone need blood') ||
      norm.includes('who need blood') ||
      norm.includes('who needs blood') ||
      norm.includes('anyone need blood') ||
      norm.includes('anyone needs blood') ||
      norm.includes('any patient') ||
      norm.includes('anyone waiting') ||
      norm.includes('who is waiting') ||
      norm.includes('open request') ||
      norm.includes('request for me') ||
      norm.includes('my request') ||
      norm.includes('matching request') ||
      norm.includes('compatible') ||
      norm.includes('find request') ||
      norm.includes('request matching') ||
      norm.includes('blood group') ||
      norm.includes('how many request') ||
      norm.includes('nearest request') ||
      norm.includes('who need') ||
      norm.includes('who needs');

    if (isDonorRequestDataQuery) {
      const data = await aiTools.executeTool('getOpenRequestsForMe', {}, userContext);
      const bg = data.donorBloodGroup || '';
      const count = data.totalMatchingRequests || 0;
      let reply = '';
      const actions = [];

      if (count === 0) {
        reply = 'No open requests match your blood group right now.';
        const viewAct = buildAction('donor-requests', { label: 'View Requests' });
        if (viewAct) actions.push(viewAct);
      } else if (count === 1) {
        const top = (data.requests && data.requests[0]) || {};
        const reqBg = top.bloodGroup || bg;
        const units = top.unitsNeeded || 1;
        const hospital = top.hospitalName || 'City General Hospital';
        const urgency = (top.urgency || 'HIGH').toUpperCase();
        reply = `Yes, 1 patient is waiting for your blood type: ${reqBg} needs ${units} unit(s) at ${hospital} (urgency: ${urgency}).`;
        const viewAct = buildAction('donor-requests', { label: 'View Requests' });
        const pledgeAct = buildAction('donor-requests', { label: 'Respond / Pledge' });
        if (viewAct) actions.push(viewAct);
        if (pledgeAct) actions.push(pledgeAct);
      } else {
        const top = (data.requests && data.requests[0]) || {};
        const reqBg = top.bloodGroup || bg;
        const units = top.unitsNeeded || 1;
        const hospital = top.hospitalName || 'City General Hospital';
        const urgency = (top.urgency || 'HIGH').toUpperCase();
        reply = `Yes, ${count} patients are waiting for your blood type: ${reqBg} needs ${units} unit(s) at ${hospital} (urgency: ${urgency}).`;
        const viewAct = buildAction('donor-requests', { label: 'View Requests' });
        if (viewAct) actions.push(viewAct);
      }

      return {
        reply,
        actions,
        suggestions,
        provider: 'keyword',
        fallbackReason,
      };
    }

    // 3d. Donation history & past pledges
    if (norm.includes('history') || norm.includes('past donate') || norm.includes('pledge')) {
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

    // 3e. Alerts & Notifications
    if (norm.includes('alert') || norm.includes('notification')) {
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

    // 3f. Profile & Standby status
    if (norm.includes('profile') || norm.includes('standby') || norm.includes('online') || norm.includes('availability')) {
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

  // 4. Hospital data intents
  if (isHospital) {
    if (norm.includes('inventory') || norm.includes('stock') || norm.includes('unit') || norm.includes('reserves')) {
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

    if (norm.includes('demand') || norm.includes('incoming')) {
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

    if (norm.includes('active request') || norm.includes('broadcast') || norm.includes('open request') || norm.includes('hospital request')) {
      const data = await aiTools.executeTool('getActiveRequests', {}, userContext);
      let reply = '';
      if (data.status === 'unverified') {
        reply = data.message;
      } else if (data.totalActive === 0) {
        reply = `0 active requests. Your hospital has not broadcast any open blood requests to community donors right now.`;
      } else {
        const topList = (data.activeRequests || []).slice(0, 2).map((r) =>
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

    if (norm.includes('pledge') || norm.includes('pending pledge')) {
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

    if (norm.includes('verification') || norm.includes('verified') || norm.includes('approval')) {
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

  // 5. Admin data intents
  if (isAdmin) {
    if (norm.includes('stat') || norm.includes('analytics') || norm.includes('summary') || norm.includes('metric')) {
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

    if (norm.includes('pending') || norm.includes('approve hospital') || norm.includes('unverified hospital')) {
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

    if (norm.includes('shortage') || norm.includes('insight') || norm.includes('alert')) {
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

    if (norm.includes('request master') || norm.includes('all request')) {
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

  // 6. Navigation / "Where is..." general lookup
  let guide = await aiTools.executeTool('getHowToGuide', { topic: lower }, userContext);
  if (!guide || !guide.found) {
    guide = await aiTools.executeTool('getHowToGuide', { topic: norm }, userContext);
  }
  if (guide && guide.found) {
    return {
      reply: `${guide.description} You can find this under ${guide.title}.`,
      actions: guide.action ? [guide.action] : [],
      suggestions,
      provider: 'keyword',
      fallbackReason,
    };
  }

  // 7. In-scope check:
  // If the message contains ANY LifeLink term or is a capability query, return helpful guidance with chips.
  if (isCapabilityQuery(raw) || isCapabilityQuery(norm) || hasLifeLinkTerm(raw) || hasLifeLinkTerm(norm)) {
    return handleInScopeHelp(userContext, options);
  }

  // 8. Refusal is the LAST resort for completely unrelated queries (e.g. sports, poems, math)
  return handleOffTopic(userContext, options);
}

module.exports = {
  isGreeting,
  handleGreeting,
  isOffTopic,
  hasLifeLinkTerm,
  isCapabilityQuery,
  handleOffTopic,
  handleInScopeHelp,
  normalizeMessage,
  routeWithKeywords,
  getSuggestionsForRole,
  FIXED_REFUSAL,
};
