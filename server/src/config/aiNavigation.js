/**
 * Single source of truth for LifeLink AI Navigation.
 * Mirrored in client constants so paths never drift.
 */

const AI_NAVIGATION_ENTRIES = [
  // --- Hospital Routes & Tabs ---
  {
    id: 'hospital-overview',
    roles: ['hospital', 'admin'],
    title: 'Hospital Command Center',
    path: '/hospital/dashboard',
    tab: 'overview',
    keywords: ['hospital overview', 'hospital command center', 'hospital summary', 'hospital home'],
    description: 'Hospital command center overview, stats, and operational summary.',
  },
  {
    id: 'hospital-inventory',
    roles: ['hospital', 'admin'],
    title: 'Inventory Reserves',
    path: '/hospital/dashboard',
    tab: 'inventory',
    keywords: ['inventory', 'blood bank', 'stock', 'units', 'reserves', 'blood stock', 'inventory reserves'],
    description: 'Hospital blood bank stock levels and inventory units for all 8 blood groups.',
  },
  {
    id: 'hospital-demands',
    roles: ['hospital', 'admin'],
    title: 'Incoming Demands',
    path: '/hospital/dashboard',
    tab: 'incoming-requests',
    keywords: ['incoming demands', 'patient requests', 'review demands', 'blood demands', 'incoming requests'],
    description: 'Incoming patient emergency blood requests addressed directly to your facility.',
  },
  {
    id: 'hospital-active-requests',
    roles: ['hospital', 'admin'],
    title: 'Active Requests',
    path: '/hospital/dashboard',
    tab: 'active-requests',
    keywords: ['active requests', 'broadcast requests', 'hospital requests', 'my requests'],
    description: 'Active and completed emergency blood requests broadcast by your hospital.',
  },
  {
    id: 'hospital-create-request',
    roles: ['hospital', 'admin'],
    title: 'New Blood Request',
    path: '/hospital/dashboard',
    keywords: ['new blood request', 'create request', 'broadcast request', 'request blood', 'post request'],
    description: 'Broadcast a new emergency blood request to compatible community donors.',
  },
  {
    id: 'hospital-matching',
    roles: ['hospital', 'admin'],
    title: 'Matching Donors',
    path: '/hospital/matching',
    keywords: ['matching donors', 'find matching donors', 'candidate donors', 'donor matches', 'ping donors'],
    description: 'Locate and coordinate with compatible nearby donors for your active requests.',
  },

  // --- User / Donor Routes & Tabs ---
  {
    id: 'donor-overview',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Donor Portal Overview',
    path: '/donor/dashboard',
    tab: 'overview',
    keywords: ['donor overview', 'portal overview', 'dashboard', 'donor home'],
    description: 'Donor portal overview, emergency alerts, and quick health and impact stats.',
  },
  {
    id: 'donor-requests',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Community Requests',
    path: '/donor/dashboard',
    tab: 'requests',
    keywords: ['community requests', 'live requests', 'open requests', 'blood requests', 'requests'],
    description: 'Browse live open blood requests from patients and hospitals.',
  },
  {
    id: 'donor-for-you',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'For You',
    path: '/donor/dashboard',
    tab: 'pings',
    keywords: ['for you', 'direct pings', 'emergency pings', 'matching requests', 'pings'],
    description: 'Direct emergency blood pings sent to you by hospitals matching your blood group.',
  },
  {
    id: 'donor-profile',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Profile & Health',
    path: '/donor/dashboard',
    tab: 'profile',
    keywords: ['profile', 'health', 'blood group', 'contact info', 'edit profile'],
    description: 'Manage your donor profile, medical eligibility, and blood group.',
  },
  {
    id: 'donor-history',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Donation History',
    path: '/donor/dashboard',
    tab: 'history',
    keywords: ['history', 'donations', 'pledges', 'past donations', 'donation history'],
    description: 'Track your past blood donations, completed pledges, and lives saved.',
  },
  {
    id: 'donor-alerts',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Alerts & Notifications',
    path: '/donor/dashboard',
    tab: 'notifications',
    keywords: ['alerts', 'notifications', 'updates', 'messages'],
    description: 'View real-time notification alerts, pledge updates, and system messages.',
  },
  {
    id: 'donor-hospitals',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Partner Hospitals',
    path: '/donor/dashboard',
    tab: 'camps',
    keywords: ['hospitals', 'partner hospitals', 'blood banks', 'verified hospitals', 'camps'],
    description: 'Browse verified partner medical centers and hospital blood banks.',
  },
  {
    id: 'donor-toggle-standby',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Toggle Standby Status',
    path: '/donor/dashboard',
    tab: 'profile',
    keywords: ['toggle standby', 'go online', 'go offline', 'standby status', 'availability status', 'online status'],
    description: 'Switch your emergency donor standby status between online and offline in Profile & Health.',
  },
  {
    id: 'individual-create-request',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Create Emergency Request',
    path: '/individual/create',
    keywords: ['create emergency request', 'patient request', 'request blood', 'need blood', 'new patient request'],
    description: 'Submit an emergency blood request directed to a hospital or nearby donors.',
  },
  {
    id: 'individual-track-request',
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    title: 'Track Blood Request',
    path: '/individual/track/:id',
    keywords: ['track request', 'track blood', 'request status', 'donation status'],
    description: 'Track the real-time status, fulfillment, and pledges for your blood request.',
  },

  // --- Admin Routes & Tabs ---
  {
    id: 'admin-overview',
    roles: ['admin'],
    title: 'Admin Command Center',
    path: '/admin/dashboard',
    tab: 'overview',
    keywords: ['admin overview', 'admin command center', 'governance overview'],
    description: 'Platform oversight, system metrics, and quick admin governance stats.',
  },
  {
    id: 'admin-users',
    roles: ['admin'],
    title: 'Donors & Hospitals',
    path: '/admin/dashboard',
    tab: 'users',
    keywords: ['donors and hospitals', 'approve hospitals', 'hospital verification', 'verify hospital', 'manage users'],
    description: 'Review and approve hospital registrations and manage registered donors.',
  },
  {
    id: 'admin-requests',
    roles: ['admin'],
    title: 'Blood Request Master',
    path: '/admin/dashboard',
    tab: 'requests',
    keywords: ['blood request master', 'all requests', 'manage requests', 'request audit'],
    description: 'Monitor and govern all emergency blood requests across the platform.',
  },
  {
    id: 'admin-analytics',
    roles: ['admin'],
    title: 'Platform Analytics',
    path: '/admin/dashboard',
    tab: 'analytics',
    keywords: ['analytics', 'platform analytics', 'trends', 'fulfillment rates', 'blood metrics'],
    description: 'In-depth platform analytics, fulfillment trends, and blood group distribution.',
  },
  {
    id: 'admin-ai-insights',
    roles: ['admin'],
    title: 'AI Insights',
    path: '/admin/dashboard',
    tab: 'ai-insights',
    keywords: ['ai insights', 'shortage alerts', 'predictive insights', 'inventory insights'],
    description: 'AI-generated inventory risk insights, shortage alerts, and operational guidance.',
  },

  // --- Public Routes ---
  {
    id: 'public-home',
    roles: ['public', 'user', 'donor', 'individual', 'recipient', 'hospital', 'admin'],
    title: 'Home',
    path: '/',
    keywords: ['home', 'landing page', 'lifelink home'],
    description: 'LifeLink homepage and introduction to the emergency blood network.',
  },
  {
    id: 'public-about',
    roles: ['public', 'user', 'donor', 'individual', 'recipient', 'hospital', 'admin'],
    title: 'About LifeLink',
    path: '/about',
    keywords: ['about', 'mission', 'about lifelink', 'how it works'],
    description: 'Learn about LifeLink’s mission, technology, and emergency response network.',
  },
  {
    id: 'public-find-donors',
    roles: ['public', 'user', 'donor', 'individual', 'recipient', 'hospital', 'admin'],
    title: 'Find Donors & Hospitals',
    path: '/find-donors',
    keywords: ['find donors', 'search hospitals', 'find blood', 'directory', 'find donors and hospitals'],
    description: 'Search the public directory of available blood donors and verified medical centers.',
  },
  {
    id: 'public-emergency-request',
    roles: ['public', 'user', 'donor', 'individual', 'recipient', 'hospital', 'admin'],
    title: 'Emergency Request',
    path: '/emergency-request',
    keywords: ['emergency request', 'emergency blood request', 'immediate blood', 'urgent blood'],
    description: 'Create an urgent emergency blood request without logging in.',
  },
  {
    id: 'public-login',
    roles: ['public'],
    title: 'Login',
    path: '/login',
    keywords: ['login', 'sign in', 'log in'],
    description: 'Sign in to your LifeLink donor, hospital, or admin account.',
  },
  {
    id: 'public-register',
    roles: ['public'],
    title: 'Register',
    path: '/register',
    keywords: ['register', 'sign up', 'join'],
    description: 'Register as a blood donor or partner hospital on LifeLink.',
  },
];

/**
 * Standard action builder - the ONLY sanctioned way actions are created.
 * @param {string} entryId
 * @param {Object} [options]
 * @param {Object} [options.params] e.g. { id: 'req123' }
 * @param {string} [options.label] Custom override label if desired
 * @returns {{ type: 'navigate', label: string, path: string, tab?: string } | null}
 */
function buildAction(entryId, options = {}) {
  const entry = AI_NAVIGATION_ENTRIES.find((item) => item.id === entryId);
  if (!entry) return null;

  let resolvedPath = entry.path;
  if (options.params) {
    Object.entries(options.params).forEach(([key, val]) => {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(val));
    });
  }

  const action = {
    type: 'navigate',
    label: options.label || entry.title,
    path: resolvedPath,
  };

  if (entry.tab) {
    action.tab = entry.tab;
  }

  return action;
}

/**
 * Get all navigation entries accessible by a given role.
 * Normalizes 'donor' | 'recipient' | 'individual' -> 'user'.
 * @param {string} [userRole='public']
 * @returns {Array<typeof AI_NAVIGATION_ENTRIES[0]>}
 */
function getNavigationForRole(userRole = 'public') {
  const role = userRole || 'public';
  return AI_NAVIGATION_ENTRIES.filter((entry) => {
    if (entry.roles.includes('*') || entry.roles.includes('public')) return true;
    if (entry.roles.includes(role)) return true;
    // Map individual-family roles
    if (['user', 'donor', 'recipient', 'individual'].includes(role)) {
      return entry.roles.some((r) => ['user', 'donor', 'recipient', 'individual'].includes(r));
    }
    return false;
  });
}

/**
 * Match user query keywords to navigation entries.
 * @param {string} query
 * @param {string} [userRole='public']
 * @returns {typeof AI_NAVIGATION_ENTRIES[0] | null}
 */
function matchNavigationEntry(query, userRole = 'public') {
  if (!query) return null;
  const normalized = query.toLowerCase().trim();
  const allowed = getNavigationForRole(userRole);

  // Exact or keyword inclusion match
  for (const entry of allowed) {
    if (normalized.includes(entry.id.toLowerCase())) return entry;
    if (normalized.includes(entry.title.toLowerCase())) return entry;
    for (const kw of entry.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        return entry;
      }
    }
  }

  return null;
}

module.exports = {
  AI_NAVIGATION_ENTRIES,
  buildAction,
  getNavigationForRole,
  matchNavigationEntry,
};

