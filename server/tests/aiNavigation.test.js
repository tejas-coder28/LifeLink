const {
  AI_NAVIGATION_ENTRIES,
  buildAction,
  getNavigationForRole,
  matchNavigationEntry,
} = require('../src/config/aiNavigation');

describe('AI Navigation Map & Action Builder', () => {
  test('AI_NAVIGATION_ENTRIES has expected structure for all entries', () => {
    expect(AI_NAVIGATION_ENTRIES.length).toBeGreaterThan(15);
    AI_NAVIGATION_ENTRIES.forEach((entry) => {
      expect(entry).toHaveProperty('id');
      expect(Array.isArray(entry.roles)).toBe(true);
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('path');
      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(entry).toHaveProperty('description');
    });
  });

  test('buildAction builds standard navigate action object', () => {
    const action = buildAction('hospital-inventory');
    expect(action).toEqual({
      type: 'navigate',
      label: 'Inventory Reserves',
      path: '/hospital/dashboard',
      tab: 'inventory',
    });
  });

  test('buildAction replaces path parameters when provided', () => {
    const action = buildAction('individual-track-request', {
      params: { id: 'req-987' },
    });
    expect(action).toEqual({
      type: 'navigate',
      label: 'Track Blood Request',
      path: '/individual/track/req-987',
    });
  });

  test('buildAction returns null for non-existent entry id', () => {
    const action = buildAction('unknown-route-id');
    expect(action).toBeNull();
  });

  test('getNavigationForRole isolates hospital routes from donors', () => {
    const donorNav = getNavigationForRole('donor');
    const hospitalNav = getNavigationForRole('hospital');

    const donorHasHospitalInventory = donorNav.some((e) => e.id === 'hospital-inventory');
    const hospitalHasHospitalInventory = hospitalNav.some((e) => e.id === 'hospital-inventory');

    expect(donorHasHospitalInventory).toBe(false);
    expect(hospitalHasHospitalInventory).toBe(true);
  });

  test('matchNavigationEntry matches queries based on keywords and role', () => {
    const matched = matchNavigationEntry('where is my blood stock inventory?', 'hospital');
    expect(matched).not.toBeNull();
    expect(matched.id).toBe('hospital-inventory');

    // Donor cannot match hospital inventory
    const donorMatch = matchNavigationEntry('where is my blood stock inventory?', 'donor');
    expect(donorMatch).toBeNull();
  });
});

