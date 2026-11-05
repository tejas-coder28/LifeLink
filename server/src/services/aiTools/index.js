const userTools = require('./userTools');
const hospitalTools = require('./hospitalTools');
const adminTools = require('./adminTools');
const sharedTools = require('./sharedTools');

/**
 * Tool definitions with metadata and Gemini function declaration schemas.
 */
const TOOL_DEFINITIONS = {
  // --- User / Donor Tools ---
  getMyProfile: {
    fn: userTools.getMyProfile,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Fetch the authenticated donor profile including blood group, availability, and contact details.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getEligibility: {
    fn: userTools.getEligibility,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Check whether the donor is currently eligible to donate blood based on the 90-day cooldown interval.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getOpenRequestsForMe: {
    fn: userTools.getOpenRequestsForMe,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Find active emergency blood requests compatible with the donor blood group, sorted by nearest distance.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getMyRequests: {
    fn: userTools.getMyRequests,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Fetch emergency blood requests created by this user and their current fulfillment status.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getMyDonationHistory: {
    fn: userTools.getMyDonationHistory,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Fetch past blood donation records and completed pledges for this donor.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getMyAlerts: {
    fn: userTools.getMyAlerts,
    roles: ['user', 'donor', 'individual', 'recipient', 'admin'],
    description: 'Fetch recent notification alerts and updates for the logged in user.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },

  // --- Hospital Tools ---
  getInventory: {
    fn: hospitalTools.getInventory,
    roles: ['hospital', 'admin'],
    description: 'Fetch the hospital blood bank inventory for all 8 blood groups, showing total units, low stock, and critical shortages.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getIncomingDemands: {
    fn: hospitalTools.getIncomingDemands,
    roles: ['hospital', 'admin'],
    description: 'Fetch incoming patient emergency blood requests directed specifically to this hospital awaiting review.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getActiveRequests: {
    fn: hospitalTools.getActiveRequests,
    roles: ['hospital', 'admin'],
    description: 'Fetch active emergency blood requests broadcast by this hospital to community donors.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getPendingPledges: {
    fn: hospitalTools.getPendingPledges,
    roles: ['hospital', 'admin'],
    description: 'Fetch active donor pledges awaiting hospital verification and intake.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getMatchingDonors: {
    fn: hospitalTools.getMatchingDonors,
    roles: ['hospital', 'admin'],
    description: 'Find compatible nearby candidate donors for a specific emergency blood request belonging to this hospital.',
    parameters: {
      type: 'OBJECT',
      properties: {
        requestId: {
          type: 'STRING',
          description: 'The unique ID of the blood request belonging to this hospital.',
        },
      },
      required: ['requestId'],
    },
  },
  getMyVerificationStatus: {
    fn: hospitalTools.getMyVerificationStatus,
    roles: ['hospital', 'admin'],
    description: 'Check whether this hospital facility has been verified and approved by administrators.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },

  // --- Admin Tools ---
  getPlatformStats: {
    fn: adminTools.getPlatformStats,
    roles: ['admin'],
    description: 'Get platform-wide overview statistics including total donors, requests, and fulfillment rate.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getPendingHospitals: {
    fn: adminTools.getPendingHospitals,
    roles: ['admin'],
    description: 'Get the list of newly registered partner hospitals pending administrator verification.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getShortageAlerts: {
    fn: adminTools.getShortageAlerts,
    roles: ['admin'],
    description: 'Get blood supply shortage warnings, high-risk blood groups, and AI recommendations.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  getRequestOverview: {
    fn: adminTools.getRequestOverview,
    roles: ['admin'],
    description: 'Get an overview of recent emergency blood requests and active request volume across the platform.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },

  // --- Shared Tools ---
  getHowToGuide: {
    fn: sharedTools.getHowToGuide,
    roles: ['public', 'user', 'donor', 'individual', 'recipient', 'hospital', 'admin'],
    description: 'Provide how-to instructions and direct navigation buttons for LifeLink features and pages.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: {
          type: 'STRING',
          description: 'The feature or topic the user is asking about (e.g. "inventory", "donor profile", "emergency request").',
        },
      },
      required: ['topic'],
    },
  },
};

/**
 * Normalizes role string.
 */
function normalizeRole(role) {
  if (!role) return 'public';
  if (['user', 'donor', 'individual', 'recipient'].includes(role)) return 'user';
  return role;
}

/**
 * Returns tool names allowed for a given role.
 */
function getToolsForRole(role) {
  const norm = normalizeRole(role);
  return Object.keys(TOOL_DEFINITIONS).filter((toolName) => {
    const entry = TOOL_DEFINITIONS[toolName];
    if (entry.roles.includes('public') || entry.roles.includes('*')) return true;
    if (entry.roles.includes(norm)) return true;
    if (['user', 'donor', 'individual', 'recipient'].includes(role)) {
      return entry.roles.some((r) => ['user', 'donor', 'individual', 'recipient'].includes(r));
    }
    return false;
  });
}

/**
 * Returns Gemini function declarations for the caller's role.
 */
function getToolDeclarationsForRole(role) {
  const allowed = getToolsForRole(role);
  return allowed.map((name) => {
    const def = TOOL_DEFINITIONS[name];
    return {
      name,
      description: def.description,
      parameters: def.parameters,
    };
  });
}

/**
 * Executes a tool securely:
 * 1. Verifies that the tool is strictly authorized for the caller's role.
 * 2. Injects user identity directly from server context (ignoring model args).
 * 3. Returns compact JSON.
 */
async function executeTool(toolName, rawArgs = {}, userContext = {}) {
  const def = TOOL_DEFINITIONS[toolName];
  if (!def) {
    const error = new Error(`Unknown tool: ${toolName}`);
    error.statusCode = 404;
    throw error;
  }

  const role = userContext.role || 'public';
  const allowedTools = getToolsForRole(role);
  if (!allowedTools.includes(toolName)) {
    const error = new Error(`Unauthorized tool execution: '${toolName}' is not accessible for role '${role}'`);
    error.statusCode = 403;
    throw error;
  }

  // Sanitize args: strip any spoofed identity parameters
  const sanitizedArgs = { ...(rawArgs || {}) };
  delete sanitizedArgs.userId;
  delete sanitizedArgs.hospitalId;
  delete sanitizedArgs.donorId;
  delete sanitizedArgs.role;

  // Execute pure async function with trusted server context
  return await def.fn(userContext, sanitizedArgs);
}

module.exports = {
  TOOL_DEFINITIONS,
  getToolsForRole,
  getToolDeclarationsForRole,
  executeTool,
};

