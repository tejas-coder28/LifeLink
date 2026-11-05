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

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

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
1. APP-ONLY RESTRICTION: You may ONLY answer questions directly pertaining to LifeLink: emergency blood requests, blood donors, blood bank inventory, donations, and platform navigation.
2. REFUSAL RULE: If the user asks about ANYTHING ELSE (including but not limited to sports, news, politics, entertainment, coding, software development, math, recipes, weather, movies, jokes, general knowledge, or personal advice), you MUST refuse with this EXACT sentence and nothing else:
"${FIXED_REFUSAL}"
3. READ-ONLY SCOPE: You have read-only tools to retrieve real-time data for the current user's role. You CANNOT perform database writes, modify inventories, or execute requests.
4. ROLE BOUNDARIES: You must only discuss information accessible to the current role (${role}). A donor cannot inspect another user's contact information or hospital inventory.
5. NAVIGATION GUIDANCE: When the user asks where a feature is located or how to access something, tell them where it is located in the app and call the "getHowToGuide" tool with the topic so a direct navigation button is rendered.
6. CONCISE & CLINICAL: Keep your answers concise, empathetic, medically accurate, and clinical. Format numbers and blood groups clearly (e.g. O+, A-).`;
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
  const providerConfig = process.env.AI_PROVIDER || 'gemini';
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const modelName = process.env.AI_MODEL || DEFAULT_MODEL;

  // 1. Off-topic check (fast failsafe)
  if (isOffTopic(message)) {
    return handleOffTopic(userContext);
  }

  // 2. Fallback if Gemini is disabled or API key is not configured
  if (providerConfig === 'keyword' || !apiKey) {
    return await routeWithKeywords(message, userContext);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const role = userContext.role || 'public';
    const toolDeclarations = getToolDeclarationsForRole(role);
    const systemInstruction = buildSystemInstruction(userContext);

    // Prepare contents
    const contents = formatHistoryForGemini(history);
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const collectedActions = [];
    let replyText = '';
    let rounds = 0;
    const maxRounds = 3;

    while (rounds < maxRounds) {
      rounds++;

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: toolDeclarations.length > 0 ? [{ functionDeclarations: toolDeclarations }] : undefined,
          temperature: 0.1,
        },
      });

      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Gemini request timed out after ${timeoutMs}ms`)), timeoutMs);
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
            functionCall: {
              name: fc.name,
              args: fc.args || {},
            },
          })),
        });

        // Execute function calls sequentially
        const functionResponseParts = [];
        for (const fc of functionCalls) {
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
              const act = buildAction('hospital-active-requests');
              if (act) collectedActions.push(act);
            } else if (fc.name === 'getEligibility' || fc.name === 'getMyProfile') {
              const act = buildAction('donor-profile');
              if (act) collectedActions.push(act);
            } else if (fc.name === 'getOpenRequestsForMe') {
              const act = buildAction('donor-requests');
              if (act) collectedActions.push(act);
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

            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: { output: toolResult },
              },
            });
          } catch (toolErr) {
            functionResponseParts.push({
              functionResponse: {
                name: fc.name,
                response: { error: toolErr.message || 'Tool execution failed' },
              },
            });
          }
        }

        // Send function responses back to Gemini
        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      } else {
        replyText = response.text || '';
        break;
      }
    }

    // Defensive reply validation
    if (!replyText || typeof replyText !== 'string' || replyText.trim().length === 0) {
      // If model produced no final text, fallback to Provider A
      return await routeWithKeywords(message, userContext);
    }

    const trimmedReply = replyText.slice(0, 2000).trim();

    // If the model determined it was off-topic and returned the refusal
    const isRefusal = trimmedReply.includes('I can only help with LifeLink');
    const finalActions = isRefusal ? [] : deduplicateActions(collectedActions);

    return {
      reply: trimmedReply,
      actions: finalActions,
      suggestions: getSuggestionsForRole(role),
      provider: 'gemini',
    };
  } catch (err) {
    // Structured warning log with NO SECRETS
    console.warn(
      `[LifeLink AI] Gemini provider error (${err.name || 'Error'}): ${err.message}. Seamlessly falling back to Provider A (keyword router).`
    );
    return await routeWithKeywords(message, userContext);
  }
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
  generateChatReply,
  buildSystemInstruction,
  formatHistoryForGemini,
  deduplicateActions,
};
