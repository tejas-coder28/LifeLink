const { matchNavigationEntry, buildAction, getNavigationForRole } = require('../../config/aiNavigation');

/**
 * Returns navigation and how-to guidance for a specific feature or page in LifeLink.
 * Returns a one-click action built via buildAction.
 */
async function getHowToGuide(context, args = {}) {
  const { topic } = args;
  const role = context?.role || 'public';

  const entry = matchNavigationEntry(topic, role);
  if (!entry) {
    const available = getNavigationForRole(role).slice(0, 4);
    return {
      found: false,
      message: `I couldn't find a direct guide for "${topic || ''}". Here are key areas you can visit:`,
      suggestions: available.map((a) => a.title),
      action: null,
    };
  }

  const action = buildAction(entry.id);

  return {
    found: true,
    title: entry.title,
    description: entry.description,
    path: entry.path,
    tab: entry.tab || null,
    action,
    guidance: `You can access "${entry.title}" at ${entry.path}${entry.tab ? ` (tab: ${entry.tab})` : ''}.`,
  };
}

const GLOSSARY_TERMS = {
  'fulfillment rate': 'The percentage of emergency blood requests successfully matched and fulfilled by registered donors or reserve inventory.',
  'cooldown': 'A mandatory 90-day rest interval after a blood donation to ensure donor safety and full red-cell recovery before giving blood again.',
  'standby': 'A readiness state where a registered donor is active and willing to receive urgent emergency donation notifications for compatible patients.',
  'pledge vs donation': 'A pledge is a donor\'s immediate commitment to donate for an emergency request; a donation is the completed, verified intake confirmed by the medical facility.',
  'urgency levels': 'Clinical triage priority: Critical (immediate life-saving need within hours), High (needed within 24 hours), Medium (needed within 48-72 hours), and Low (scheduled procedure).',
  'unit/ml': 'Standard blood measurement: 1 whole blood unit equals approximately 450 milliliters (ml) of donated blood.',
  'matching score': 'An algorithmic ranking based on ABO/Rh compatibility, geographic proximity (Haversine distance), and donor cooldown eligibility.',
  'compatible blood groups': 'Blood transfusion safety matrix based on antigens: O- is universal donor (can donate to all), AB+ is universal recipient (can receive from all), and positive Rh types can only donate to positive types.',
};

/**
 * Returns plain-language medical and operational definitions for LifeLink concepts.
 */
async function getAppGlossary(context, args = {}) {
  const query = (args.term || '').toLowerCase().trim();
  if (!query) {
    return {
      terms: Object.keys(GLOSSARY_TERMS),
      definitions: GLOSSARY_TERMS,
    };
  }

  const matchedKey = Object.keys(GLOSSARY_TERMS).find(
    (k) => query.includes(k) || k.includes(query)
  );

  if (matchedKey) {
    return {
      term: matchedKey,
      definition: GLOSSARY_TERMS[matchedKey],
    };
  }

  return {
    term: query,
    definition: 'LifeLink provides emergency blood donation matching, real-time inventory tracking, and clinical coordination between hospitals and donors.',
    allTerms: Object.keys(GLOSSARY_TERMS),
  };
}

module.exports = {
  getHowToGuide,
  getAppGlossary,
  GLOSSARY_TERMS,
};

