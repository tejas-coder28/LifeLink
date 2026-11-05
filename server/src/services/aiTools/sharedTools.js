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

module.exports = {
  getHowToGuide,
};
