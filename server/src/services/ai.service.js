const { GoogleGenAI } = require('@google/genai');
const AIInsight = require('../repositories/aiInsight.repository');
const analyticsService = require('./analytics.service');
const BloodRequest = require('../repositories/bloodRequest.repository');
const { getAiConfig } = require('./geminiService');

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_GROUP_PATTERN = /\b(AB[+-]|A[+-]|B[+-]|O[+-])/gi;

/**
 * Builds authoritative metrics from live platform analytics so generated reports
 * always stay in exact numerical parity with the Admin Dashboard and analytics charts.
 */
function buildMetricsSnapshot(analytics) {
  const summary = analytics?.summary || {};
  const distribution = analytics?.bloodGroupDistribution || [];
  const inventoryByGroup = analytics?.inventoryByGroup || {};
  const shortageGroups = Array.isArray(analytics?.shortageGroups) ? analytics.shortageGroups : [];

  const totalInventoryUnits = Object.values(inventoryByGroup).reduce(
    (sum, units) => sum + (Number(units) || 0),
    0
  );

  const surplusGroups = distribution
    .filter((b) => {
      if (shortageGroups.includes(b.bloodGroup)) return false;
      const stockUnits = Number(inventoryByGroup[b.bloodGroup]) || 0;
      return b.donors > b.requests || stockUnits >= 15;
    })
    .map((b) => b.bloodGroup);

  return {
    totalDonors: Number(summary.totalDonors) || 0,
    activeStandbyDonors: Number(summary.availableDonors) || 0,
    totalRequests: Number(summary.totalRequests) || 0,
    fulfilledRequests: Number(summary.fulfilledRequests) || 0,
    openRequests: Number(summary.openRequests) || 0,
    fulfillmentRate: `${Number(summary.fulfillmentRate) || 0}%`,
    totalInventoryUnits,
    highRiskBloodGroups: shortageGroups,
    surplusGroups,
  };
}

/**
 * Finds hospital stock groups currently critical (0 units) or low (1-3 units).
 */
function getInventoryHealthBreakdown(inventoryByGroup = {}) {
  const zeroStock = [];
  const lowStock = [];
  for (const bg of ALL_BLOOD_GROUPS) {
    const units = Number(inventoryByGroup[bg] ?? 0);
    if (units === 0) zeroStock.push(bg);
    else if (units <= 3) lowStock.push(`${bg} (${units})`);
  }
  return { zeroStock, lowStock };
}

/**
 * Deterministic rule-based fallback generator that preserves metric parity and
 * adapts its summary and recommendations when an administrator provides a custom prompt.
 */
function generateFallbackInsight(customPrompt, analytics, recentCriticalRequests, metrics) {
  const cleanPrompt = typeof customPrompt === 'string' ? customPrompt.trim() : '';
  const inventoryByGroup = analytics?.inventoryByGroup || {};
  const distribution = analytics?.bloodGroupDistribution || [];
  const { zeroStock, lowStock } = getInventoryHealthBreakdown(inventoryByGroup);
  const {
    totalDonors,
    activeStandbyDonors,
    totalRequests,
    fulfilledRequests,
    openRequests,
    fulfillmentRate,
    totalInventoryUnits,
    highRiskBloodGroups,
    surplusGroups,
  } = metrics;

  const headline = `LifeLink network status: ${totalDonors} registered donors (${activeStandbyDonors} active on standby). Emergency request fulfillment rate is currently holding at ${fulfillmentRate}.`;
  const shortageClause =
    highRiskBloodGroups.length > 0
      ? `Shortage alert identified for blood group(s): ${highRiskBloodGroups.join(', ')}. Immediate targeted donor outreach recommended.`
      : `Blood supply levels and donor coverage are in healthy equilibrium across all major categories (${totalInventoryUnits} total units in verified hospital stock, ${openRequests} open request(s)).`;

  const recommendations = [
    highRiskBloodGroups.length > 0
      ? `Launch targeted alerts for registered standby donors matching blood group(s): ${highRiskBloodGroups.join(', ')}.`
      : `Maintain active donor engagement and monitor open emergency requests (${openRequests} currently open).`,
    lowStock.length > 0 || zeroStock.length > 0
      ? `Prioritise stock replenishment for ${[...zeroStock.map((g) => `${g} (0)`), ...lowStock].join(', ')} reserves across partner hospitals.`
      : `Continue routine hospital reserve balancing across all 8 ABO/Rh blood groups (${totalInventoryUnits} total units).`,
    recentCriticalRequests.length > 0
      ? `Expedite matching for ${recentCriticalRequests.length} open high/critical urgency request(s), including ${recentCriticalRequests[0].bloodGroup} need (${recentCriticalRequests[0].unitsNeeded} unit(s)).`
      : `Preserve rapid triage turnaround for incoming critical and surgical blood demands.`,
    `Keep universal O-negative donor readiness incentivised and automate hospital low-stock alerts below 4 units.`,
  ];

  if (!cleanPrompt) {
    return {
      title: 'Emergency Donor Network & Supply Line Intelligence',
      summary: `${headline} ${shortageClause}`,
      metrics,
      recommendations,
      rawResponse: 'Generated via LifeLink Intelligent Rule-Based Engine.',
    };
  }

  const promptMatches = [...cleanPrompt.matchAll(BLOOD_GROUP_PATTERN)].map((m) => m[1].toUpperCase());
  const requestedGroups = [...new Set(promptMatches)];
  const focusParts = [];

  if (requestedGroups.length > 0) {
    const groupDetails = requestedGroups.map((bg) => {
      const dist = distribution.find((d) => d.bloodGroup === bg) || { donors: 0, requests: 0 };
      const invUnits = Number(inventoryByGroup[bg] ?? 0);
      const isShortage = highRiskBloodGroups.includes(bg);
      return `${bg}: ${dist.donors} donor(s), ${dist.requests} total request(s), ${invUnits} unit(s) in hospital reserves${isShortage ? ' [SHORTAGE ALERT]' : ''}`;
    });
    focusParts.push(`Requested blood group breakdown — ${groupDetails.join('; ')}.`);
  }

  if (/stock|inventory|reserve|unit|shortage|deficit|critical|low/i.test(cleanPrompt)) {
    const stockSummary =
      zeroStock.length > 0 || lowStock.length > 0
        ? `Low/zero stock groups: ${[...zeroStock.map((g) => `${g} (0)`), ...lowStock].join(', ')}.`
        : 'No hospital blood groups are currently at zero or low (<= 3 units) stock.';
    focusParts.push(`Hospital stock status (${totalInventoryUnits} units total): ${stockSummary}`);
  }

  if (/request|demand|open|pending|urgent|fulfill|backlog/i.test(cleanPrompt)) {
    const pendingDesc =
      recentCriticalRequests.length > 0
        ? `Active urgent requests: ${recentCriticalRequests.map((r) => `${r.patientName} (${r.bloodGroup}, ${r.unitsNeeded} unit(s), ${r.urgency})`).join('; ')}.`
        : 'No critical or high-urgency open requests are pending.';
    focusParts.push(`Request pipeline: ${fulfilledRequests}/${totalRequests} fulfilled (${fulfillmentRate}), ${openRequests} open. ${pendingDesc}`);
  }

  if (/donor|standby|available|cooldown|readiness|supply/i.test(cleanPrompt)) {
    focusParts.push(
      `Donor readiness: ${activeStandbyDonors}/${totalDonors} on standby (${totalDonors > 0 ? Math.round((activeStandbyDonors / totalDonors) * 100) : 0}%). Surplus donor groups: ${surplusGroups.length > 0 ? surplusGroups.join(', ') : 'None'}.`
    );
  }

  if (focusParts.length === 0) {
    focusParts.push(
      `Focus summary for "${cleanPrompt}": ${openRequests} open request(s), ${totalInventoryUnits} hospital stock units across 8 groups, and surplus coverage in ${surplusGroups.length > 0 ? surplusGroups.join(', ') : 'no individual group yet'}.`
    );
  }

  const snippet = cleanPrompt.length > 56 ? `${cleanPrompt.slice(0, 56)}...` : cleanPrompt;
  return {
    title: `Focused AI Insight: ${snippet}`,
    summary: `${headline} ${focusParts.join(' ')} ${shortageClause}`,
    metrics,
    recommendations,
    rawResponse: 'Generated via LifeLink Prompt-Aware Rule Engine.',
  };
}

/**
 * Generates an insight report via Google Gemini when enabled, falling back cleanly
 * to the deterministic analyzer on quota/network errors or disabled/placeholder keys.
 */
async function generateWithGemini(cleanPrompt, contextData, analytics, recentCriticalRequests, metrics) {
  const config = getAiConfig();
  if (!config.enabled) {
    return generateFallbackInsight(cleanPrompt, analytics, recentCriticalRequests, metrics);
  }

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const focusInstruction = cleanPrompt
    ? `Administrator Custom Focus Prompt: "${cleanPrompt}"\nAddress this focus directly using exact numbers from contextData.`
    : 'Provide a comprehensive regional network overview covering supply readiness, open demand, hospital reserves, and any shortages.';

  const userPrompt = `Analyze this live LifeLink emergency blood network state and return strictly valid JSON with keys:
- "title": concise report title (string)
- "summary": clinical executive summary (string, 2-4 sentences). Always cite exact totalDonors, activeStandbyDonors, fulfillmentRate%, and if shortageGroups is non-empty state "Shortage alert identified for blood group(s): <list>." Never use the word "rare" for any blood group.
- "recommendations": array of 3-4 concrete, data-grounded action strings (never use the word "rare").

${focusInstruction}

contextData:
${JSON.stringify(contextData)}`;

  for (let i = 0; i < config.modelChain.length; i++) {
    const model = config.modelChain[i];
    let timeoutHandle;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`Gemini insight timed out after ${config.timeoutMs}ms`)),
          config.timeoutMs
        );
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction:
              'You are LifeLink AI, an expert medical logistics intelligence analyst. Only cite verified facts and counts from contextData. Never call any blood group "rare". Return valid JSON only.',
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        timeoutPromise,
      ]);

      const rawText = typeof response?.text === 'string' ? response.text.trim() : '';
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      const sanitize = (str) => String(str || '').replace(/\brare\b/gi, 'low-prevalence');

      return {
        title: parsed.title ? sanitize(parsed.title) : 'AI Medical Logistics Report',
        summary: parsed.summary ? sanitize(parsed.summary) : 'Network supply analysis complete.',
        metrics,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(sanitize).filter(Boolean)
          : [],
        rawResponse: JSON.stringify({ model, text: rawText.slice(0, 1500) }),
      };
    } catch (err) {
      const status = Number(err?.status || err?.statusCode || (err?.message || '').match(/\b(429|503)\b/)?.[0]) || 0;
      if (status === 429 && i < config.modelChain.length - 1) {
        continue;
      }
      console.warn(`[LifeLink AI Insights] Gemini fallback triggered (${err.message})`);
      return generateFallbackInsight(cleanPrompt, analytics, recentCriticalRequests, metrics);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return generateFallbackInsight(cleanPrompt, analytics, recentCriticalRequests, metrics);
}

/**
 * Aggregates live network metrics, open critical demands, and hospital reserves,
 * synthesizes an insight report, and persists it in MongoDB.
 */
const generateSystemInsight = async (customPrompt = '') => {
  const cleanPrompt = typeof customPrompt === 'string' ? customPrompt.trim() : '';

  const [analytics, recentCriticalRequests] = await Promise.all([
    analyticsService.getSystemAnalytics(),
    BloodRequest.find({ urgency: { $in: ['critical', 'high'] }, status: 'open' })
      .limit(5)
      .select('patientName bloodGroup unitsNeeded urgency address createdAt'),
  ]);

  const metrics = buildMetricsSnapshot(analytics);
  const contextData = {
    summary: analytics.summary,
    bloodGroupDistribution: analytics.bloodGroupDistribution,
    inventoryByGroup: analytics.inventoryByGroup,
    shortageGroups: analytics.shortageGroups,
    urgencyDistribution: analytics.urgencyDistribution,
    recentCriticalRequests,
  };

  const insightPayload = await generateWithGemini(
    cleanPrompt,
    contextData,
    analytics,
    recentCriticalRequests,
    metrics
  );

  const insightDoc = await AIInsight.create({
    title: insightPayload.title,
    summary: insightPayload.summary,
    metrics: insightPayload.metrics,
    recommendations: insightPayload.recommendations,
    rawResponse: insightPayload.rawResponse,
  });

  return insightDoc;
};

/**
 * Returns the latest persisted AI insights, regenerating one automatically when the
 * store is empty or out of sync with live platform analytics.
 */
const getLatestInsights = async (limit = 10) => {
  let insights = await AIInsight.find().sort({ createdAt: -1 }).limit(limit);

  if (insights.length === 0) {
    const initialInsight = await generateSystemInsight();
    return [initialInsight];
  }

  const liveAnalytics = await analyticsService.getSystemAnalytics();
  const latest = insights[0];
  const latestShortages = Array.isArray(latest.metrics?.highRiskBloodGroups)
    ? [...latest.metrics.highRiskBloodGroups].sort().join(',')
    : '';
  const liveShortages = [...(liveAnalytics.shortageGroups || [])].sort().join(',');

  const metricsMatch =
    latest.metrics &&
    Number(latest.metrics.totalDonors) === liveAnalytics.summary.totalDonors &&
    Number(latest.metrics.activeStandbyDonors) === liveAnalytics.summary.availableDonors &&
    Number(latest.metrics.totalRequests) === liveAnalytics.summary.totalRequests &&
    Number(latest.metrics.fulfilledRequests) === liveAnalytics.summary.fulfilledRequests &&
    Number(latest.metrics.openRequests) === liveAnalytics.summary.openRequests &&
    latest.metrics.fulfillmentRate === `${liveAnalytics.summary.fulfillmentRate}%` &&
    latestShortages === liveShortages &&
    !/\brare\b/i.test(latest.summary || '');

  if (!metricsMatch) {
    const refreshedInsight = await generateSystemInsight();
    insights = [refreshedInsight, ...insights.slice(0, limit - 1)];
  }

  return insights;
};

module.exports = {
  generateSystemInsight,
  getLatestInsights,
};
