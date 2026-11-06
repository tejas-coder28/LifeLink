const { GoogleGenAI } = require('@google/genai');
const { getToolDeclarationsForRole, executeTool } = require('./aiTools');
const { buildAction } = require('../config/aiNavigation');
const {
  routeWithKeywords,
  getSuggestionsForRole,
  isOffTopic,
  handleOffTopic,
  FIXED_REFUSAL,
} = require('./keywordRouter');

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Model fallback chain — tried in order on HTTP 429 (quota exceeded).
 * Any other error skips directly to Provider A.
 */
const MODEL_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/**
 * Resolves AI configuration and provider status.
 * Accepts AI_API_KEY or GEMINI_API_KEY.
 * Treats literal 'PASTE_YOUR_KEY_HERE' and empty keys as unconfigured.
 */
function getAiConfig() {
  const provider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  const rawKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  // Allow AI_MODEL to override only the primary model in the chain
  const primaryOverride = process.env.AI_MODEL;
  const modelChain =
    primaryOverride && primaryOverride !== 'gemini-2.5-flash'
      ? [primaryOverride, ...MODEL_CHAIN.filter((m) => m !== primaryOverride)]
      : [...MODEL_CHAIN];

  if (provider === 'keyword') {
    return {
      enabled: false,
      provider: 'keyword',
      modelChain,
      timeoutMs,
      reason: 'disabled',
    };
  }

  if (!rawKey) {
    return {
      enabled: false,
      provider: 'keyword',
      modelChain,
      timeoutMs,
      reason: 'key missing',
    };
  }

  if (rawKey === 'PASTE_YOUR_KEY_HERE') {
    return {
      enabled: false,
      provider: 'keyword',
      modelChain,
      timeoutMs,
      reason: 'placeholder',
    };
  }

  return {
    enabled: true,
    provider: 'gemini',
    apiKey: rawKey,
    modelChain,
    timeoutMs,
    reason: null,
  };
}

/**
 * Startup log line - logs exactly one line on server initialization.
 */
function logStartupProvider() {
  const config = getAiConfig();
  if (config.enabled) {
    console.log(
      `AI provider: gemini (model chain: ${config.modelChain.join(' → ')})`
    );
  } else {
    console.log(`AI provider: keyword-only (${config.reason})`);
  }
}

/**
 * Builds the strict LifeLink system instruction for Gemini.
 */
function buildSystemInstruction(userContext = {}) {
  const role = userContext.role || 'public';
  const name = userContext.name || 'User';

  return `You are the LifeLink AI Assistant, an embedded intelligent helper for LifeLink — an emergency blood donation and blood bank network.
Current User: ${name}
Current Role: ${role}
Current Path: ${userContext.currentPath || 'unknown'}

STRICT OPERATIONAL BOUNDARIES:
1. APP-ONLY RESTRICTION: You may ONLY answer questions directly pertaining to LifeLink: emergency blood requests, blood donors, blood bank inventory, donations, and platform navigation. Short or sloppy questions about requests, patients, donors, blood, stock or the app are IN SCOPE. Call the relevant tool and lead with the count. Only return OUT_OF_SCOPE when the message has no connection to LifeLink.
2. REFUSAL RULE: If the user asks about ANYTHING ELSE (including but not limited to sports, news, politics, entertainment, coding, software development, math, recipes, weather, movies, jokes, general knowledge, or personal advice), you MUST refuse with this EXACT sentence and nothing else:
"${FIXED_REFUSAL}"
3. READ-ONLY SCOPE: You have read-only tools to retrieve real-time data for the current user's role. You CANNOT perform database writes, modify inventories, or execute requests.
4. ROLE BOUNDARIES: You must only discuss information accessible to the current role (${role}). A donor cannot inspect another user's contact information or hospital inventory.
5. NAVIGATION GUIDANCE: When the user asks where a feature is located or how to access something, tell them where it is located in the app and call the "getHowToGuide" tool with the topic so a direct navigation button is rendered.
6. CONCISE & CLINICAL: Keep your answers concise, empathetic, medically accurate, and clinical. Format numbers and blood groups clearly (e.g. O+, A-).
7. DATA FIRST: For ANY question about counts, status, or the user's own data (requests, inventory, donors, pledges, history, alerts, eligibility, etc.), you MUST call the relevant data tool FIRST before composing a reply. Lead with the actual numbers or status (e.g. "0 active requests." or "2 O+ units in stock."), then add brief context. NEVER answer a data question with only a navigation hint — always include the data value. Only respond with navigation alone when the user is asking purely "where do I find..." with no data intent.`;
}

/**
 * Maps incoming client conversation history to Gemini content format.
 */
function formatHistoryForGemini(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-8)
    .filter((h) => h && h.content && (h.role === 'user' || h.role === 'assistant'))
    .map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(h.content).slice(0, 500) }],
    }));
}

/**
 * Primary Gemini chat generator with role-scoped tool calling loop and Provider A fallback.
 */
async function generateChatReply(message, history = [], userContext = {}) {
  const config = getAiConfig();
  const role = userContext.role || 'public';

  // 1. If Gemini is not configured or disabled, immediately route via Provider A
  if (!config.enabled) {
    return await routeWithKeywords(message, userContext, { fallbackReason: config.reason });
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const toolDeclarations = getToolDeclarationsForRole(role);
  const systemInstruction = buildSystemInstruction(userContext);

  // 2. Iterate over model chain; advance only on HTTP 429 (quota exceeded)
  for (let modelIndex = 0; modelIndex < config.modelChain.length; modelIndex++) {
    const currentModel = config.modelChain[modelIndex];

    try {
      // Prepare contents fresh for each model attempt
      const contents = formatHistoryForGemini(history);
      contents.push({ role: 'user', parts: [{ text: message }] });

      const collectedActions = [];
      let replyText = '';
      let rounds = 0;
      const maxRounds = 3;

      while (rounds < maxRounds) {
        rounds++;

        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Gemini request timed out after ${config.timeoutMs}ms`)),
            config.timeoutMs
          );
        });

        const generatePromise = ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction,
            tools: toolDeclarations.length > 0 ? [{ functionDeclarations: toolDeclarations }] : undefined,
            temperature: 0.1,
          },
        });

        let response;
        try {
          response = await Promise.race([generatePromise, timeoutPromise]);
        } finally {
          clearTimeout(timeoutHandle);
        }

        const functionCalls = response.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
          // Record model turn in conversation history
          contents.push({
            role: 'model',
            parts: functionCalls.map((fc) => ({
              functionCall: { name: fc.name, args: fc.args || {} },
            })),
          });

          // Execute function calls in parallel for speed
          const functionResponseParts = await Promise.all(
            functionCalls.map(async (fc) => {
              try {
                const toolResult = await executeTool(fc.name, fc.args || {}, userContext);

                // Collect any navigation actions generated by tools
                if (toolResult && toolResult.action) {
                  collectedActions.push(toolResult.action);
                } else if (fc.name === 'getInventory') {
                  const act = buildAction('hospital-inventory');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getIncomingDemands') {
                  const act = buildAction('hospital-demands');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getActiveRequests') {
                  const act = toolResult && toolResult.totalActive === 0
                    ? buildAction('hospital-create-request')
                    : buildAction('hospital-active-requests');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getEligibility' || fc.name === 'getMyProfile') {
                  const act = buildAction('donor-profile');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getOpenRequestsForMe') {
                  const viewAct = buildAction('donor-requests', { label: 'View Requests' });
                  if (viewAct) collectedActions.push(viewAct);
                  if (toolResult && toolResult.totalMatchingRequests === 1) {
                    const top = toolResult.requests && toolResult.requests[0];
                    const reqId = top ? (top.id || top._id) : '';
                    const pledgeAct = buildAction('donor-requests', {
                      label: 'Review & Pledge',
                      query: reqId ? { request: reqId, action: 'pledge' } : undefined,
                    });
                    if (pledgeAct) collectedActions.push(pledgeAct);
                  }
                } else if (fc.name === 'getMyDonationHistory') {
                  const act = buildAction('donor-history');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getPlatformStats') {
                  const act = buildAction('admin-analytics');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getPendingHospitals') {
                  const act = buildAction('admin-users');
                  if (act) collectedActions.push(act);
                } else if (fc.name === 'getShortageAlerts') {
                  const act = buildAction('admin-ai-insights');
                  if (act) collectedActions.push(act);
                }

                return {
                  functionResponse: {
                    name: fc.name,
                    response: { output: toolResult },
                  },
                };
              } catch (toolErr) {
                return {
                  functionResponse: {
                    name: fc.name,
                    response: { error: toolErr.message || 'Tool execution failed' },
                  },
                };
              }
            })
          );

          // Send function responses back to Gemini
          contents.push({ role: 'user', parts: functionResponseParts });
        } else {
          replyText = response.text || '';
          break;
        }
      }

      // Defensive reply validation
      if (!replyText || typeof replyText !== 'string' || replyText.trim().length === 0) {
        return await routeWithKeywords(message, userContext, { fallbackReason: 'empty reply' });
      }

      const trimmedReply = replyText.slice(0, 2000).trim();
      const isRefusal = trimmedReply.includes('I can only help with LifeLink');
      const finalActions = isRefusal ? [] : deduplicateActions(collectedActions);

      return {
        reply: trimmedReply,
        actions: finalActions,
        suggestions: getSuggestionsForRole(role),
        provider: 'gemini',
        fallbackReason: null,
      };
    } catch (err) {
      const errorClass = err.constructor?.name || err.name || 'Error';
      const statusRaw =
        err.status ||
        err.statusCode ||
        (err.message && err.message.match(/\b(400|401|403|404|429|500|503)\b/)?.[0]) ||
        'unknown';
      const status = Number(statusRaw) || statusRaw;

      if (status === 429) {
        // Quota exceeded — try next model in chain
        console.warn(
          `[LifeLink AI] Quota exceeded on ${currentModel}, trying next model`
        );
        continue; // advance to next model
      }

      // Any other error — immediately fall back to Provider A
      console.warn(`[LifeLink AI] Gemini failed (${errorClass} ${status})`);
      const fallbackReason = `gemini failure (${errorClass} ${status})`;
      return await routeWithKeywords(message, userContext, { fallbackReason });
    }
  }

  // All models in chain exhausted due to quota
  console.warn('[LifeLink AI] All models quota exhausted, falling back to keyword router');
  return await routeWithKeywords(message, userContext, {
    fallbackReason: 'all models quota exhausted',
  });
}

/**
 * Deduplicates actions by path and tab.
 */
function deduplicateActions(actions = []) {
  const seen = new Set();
  const deduped = [];
  for (const act of actions) {
    if (!act || !act.path) continue;
    const key = `${act.path}#${act.tab || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(act);
    }
  }
  return deduped;
}

module.exports = {
  getAiConfig,
  logStartupProvider,
  generateChatReply,
  buildSystemInstruction,
  formatHistoryForGemini,
  deduplicateActions,
};
