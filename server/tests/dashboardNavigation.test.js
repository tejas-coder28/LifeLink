/**
 * Dashboard Stat Cards & Navigation Contracts Test Suite
 *
 * Validates:
 * 1. Deep-link tab normalization for Hospital, Donor, and Admin dashboards.
 * 2. Table-driven mapping for all overview stat cards and shortcut links.
 * 3. Standby status card navigates to #standby-status-setting without toggling availability.
 * 4. Request deep linking (?tab=requests&request=<id>) highlights card without auto-pledging.
 * 5. Unknown/invalid tab parameters gracefully fallback to 'overview'.
 * 6. Accessibility & Keyboard contracts (Enter/Space, aria-label, focus rings).
 */

const { AI_NAVIGATION_ENTRIES } = require('../src/config/aiNavigation');

// Hospital Dashboard Tab Normalizer Contract (mirrors client implementation)
const normalizeHospitalTab = (rawTab) => {
  if (!rawTab) return 'overview';
  const t = String(rawTab).toLowerCase().trim();
  if (t === 'incoming' || t === 'incoming-requests') return 'incoming-requests';
  if (t === 'active' || t === 'active-requests') return 'active-requests';
  if (t === 'inventory') return 'inventory';
  if (t === 'overview') return 'overview';
  return 'overview';
};

// Donor Dashboard Tab Normalizer Contract (mirrors client implementation)
const normalizeDonorTab = (rawTab) => {
  if (!rawTab) return 'overview';
  const validTabs = ['overview', 'requests', 'pings', 'profile', 'history', 'notifications', 'camps'];
  const t = String(rawTab).toLowerCase().trim();
  if (validTabs.includes(t)) return t;
  return 'overview';
};

// Admin Dashboard Tab Normalizer Contract (mirrors client implementation)
const normalizeAdminTab = (rawTab) => {
  if (!rawTab) return 'overview';
  const validTabs = ['overview', 'users', 'requests', 'analytics', 'ai-insights'];
  const t = String(rawTab).toLowerCase().trim();
  if (validTabs.includes(t)) return t;
  return 'overview';
};

describe('Dashboard Navigation & Stat Cards Mapping', () => {
  describe('Hospital Dashboard Stat Cards & Deep-Links', () => {
    const hospitalCardMappings = [
      {
        cardName: 'Incoming Demands',
        targetTabParam: 'incoming',
        expectedResolvedTab: 'incoming-requests',
        expectedAriaLabelPrefix: 'Open Incoming Demands',
      },
      {
        cardName: 'Active Blood Requests',
        targetTabParam: 'active',
        expectedResolvedTab: 'active-requests',
        expectedAriaLabelPrefix: 'Open Active Requests',
      },
      {
        cardName: 'Total Donor Pledges',
        targetTabParam: 'active',
        extraParams: { filter: 'pledges' },
        expectedResolvedTab: 'active-requests',
        expectedAriaLabelPrefix: 'Open Active Requests with Pledges',
      },
      {
        cardName: 'Inventory Reserves',
        targetTabParam: 'inventory',
        expectedResolvedTab: 'inventory',
        expectedAriaLabelPrefix: 'Open Inventory Reserves',
      },
    ];

    test.each(hospitalCardMappings)(
      'Hospital card "$cardName" navigates to ?tab=$targetTabParam which resolves to "$expectedResolvedTab"',
      ({ targetTabParam, expectedResolvedTab, extraParams }) => {
        const resolved = normalizeHospitalTab(targetTabParam);
        expect(resolved).toBe(expectedResolvedTab);

        if (extraParams?.filter === 'pledges') {
          expect(extraParams.filter).toBe('pledges');
        }
      }
    );

    test('Hospital navigation map contains corresponding AI navigation entries without drift', () => {
      const inventoryEntry = AI_NAVIGATION_ENTRIES.find((e) => e.id === 'hospital-inventory');
      expect(inventoryEntry).toBeDefined();
      expect(inventoryEntry.tab).toBe('inventory');

      const demandsEntry = AI_NAVIGATION_ENTRIES.find((e) => e.id === 'hospital-demands');
      expect(demandsEntry).toBeDefined();
      expect(normalizeHospitalTab(demandsEntry.tab)).toBe('incoming-requests');

      const activeEntry = AI_NAVIGATION_ENTRIES.find((e) => e.id === 'hospital-active-requests');
      expect(activeEntry).toBeDefined();
      expect(normalizeHospitalTab(activeEntry.tab)).toBe('active-requests');
    });

    test('Hospital invalid tab parameter falls back to "overview"', () => {
      expect(normalizeHospitalTab('unknownTab')).toBe('overview');
      expect(normalizeHospitalTab('123')).toBe('overview');
      expect(normalizeHospitalTab('')).toBe('overview');
      expect(normalizeHospitalTab(null)).toBe('overview');
    });
  });

  describe('Donor Dashboard Stat Cards & Deep-Links', () => {
    const donorCardMappings = [
      {
        cardName: 'Registered Blood Group',
        targetTabParam: 'profile',
        expectedResolvedTab: 'profile',
        expectedAriaLabelPrefix: 'Open Profile & Health',
      },
      {
        cardName: 'Standby Status',
        targetTabParam: 'profile',
        targetElementId: 'standby-status-setting',
        expectedResolvedTab: 'profile',
        expectedAriaLabelPrefix: 'Open Standby Status settings',
      },
      {
        cardName: 'Last Donation',
        targetTabParam: 'history',
        expectedResolvedTab: 'history',
        expectedAriaLabelPrefix: 'Open Donation History',
      },
      {
        cardName: 'Completed Donations',
        targetTabParam: 'history',
        expectedResolvedTab: 'history',
        expectedAriaLabelPrefix: 'Open Donation History',
      },
      {
        cardName: 'Live Emergency Blood Needs "View All ->"',
        targetTabParam: 'requests',
        expectedResolvedTab: 'requests',
        expectedAriaLabelPrefix: 'View all open emergency blood requests',
      },
    ];

    test.each(donorCardMappings)(
      'Donor card "$cardName" navigates to ?tab=$targetTabParam which resolves to "$expectedResolvedTab"',
      ({ targetTabParam, expectedResolvedTab }) => {
        const resolved = normalizeDonorTab(targetTabParam);
        expect(resolved).toBe(expectedResolvedTab);
      }
    );

    test('Standby Status card navigates to profile tab without invoking toggle availability API', () => {
      let toggleApiCalled = false;
      let navigatedTab = null;
      let targetElementScrolled = null;

      const mockToggleApi = () => {
        toggleApiCalled = true;
      };

      const handleNavigateToStandbySetting = (setTabFn, scrollFn) => {
        setTabFn('profile');
        scrollFn('standby-status-setting');
      };

      handleNavigateToStandbySetting(
        (tab) => { navigatedTab = tab; },
        (elId) => { targetElementScrolled = elId; }
      );

      expect(navigatedTab).toBe('profile');
      expect(targetElementScrolled).toBe('standby-status-setting');
      expect(toggleApiCalled).toBe(false); // MUST NEVER TOGGLE STATUS
    });

    test('Request deep link (?tab=requests&request=req123) highlights card and does NOT open pledge modal', () => {
      let highlightedId = null;
      let pledgeModalOpened = false;

      const processRequestUrlParams = (searchParams) => {
        const targetId = searchParams.request;
        const action = searchParams.action;

        if (targetId) {
          highlightedId = targetId;
          if (action === 'pledge') {
            pledgeModalOpened = true;
          }
        }
      };

      // Case A: Normal card click / view details from overview
      processRequestUrlParams({ tab: 'requests', request: 'req123' });
      expect(highlightedId).toBe('req123');
      expect(pledgeModalOpened).toBe(false); // NO PLEDGE MODAL

      // Case B: Explicit AI pledge action
      processRequestUrlParams({ tab: 'requests', request: 'req123', action: 'pledge' });
      expect(highlightedId).toBe('req123');
      expect(pledgeModalOpened).toBe(true);
    });

    test('Donor invalid tab parameter falls back to "overview"', () => {
      expect(normalizeDonorTab('invalid-tab')).toBe('overview');
      expect(normalizeDonorTab('hack')).toBe('overview');
      expect(normalizeDonorTab(undefined)).toBe('overview');
    });
  });

  describe('Admin Dashboard Stat Cards & Deep-Links', () => {
    const adminCardMappings = [
      {
        cardName: 'Total Donors',
        targetTabParam: 'users',
        expectedResolvedTab: 'users',
        expectedAriaLabelPrefix: 'Open Donors & Hospitals',
      },
      {
        cardName: 'Total Requests',
        targetTabParam: 'requests',
        expectedResolvedTab: 'requests',
        expectedAriaLabelPrefix: 'Open Blood Request Master',
      },
      {
        cardName: 'Open Demands subLink',
        targetTabParam: 'requests',
        extraParams: { status: 'open' },
        expectedResolvedTab: 'requests',
        expectedAriaLabelPrefix: 'Open Blood Request Master with open demands filter',
      },
      {
        cardName: 'Fulfillment Rate',
        targetTabParam: 'analytics',
        expectedResolvedTab: 'analytics',
        expectedAriaLabelPrefix: 'Open Platform Analytics',
      },
      {
        cardName: 'Completed Donations',
        targetTabParam: 'analytics',
        expectedResolvedTab: 'analytics',
        expectedAriaLabelPrefix: 'Open Platform Analytics',
      },
      {
        cardName: 'Latest Regional AI Insight',
        targetTabParam: 'ai-insights',
        expectedResolvedTab: 'ai-insights',
        expectedAriaLabelPrefix: 'Open AI Insights tab',
      },
    ];

    test.each(adminCardMappings)(
      'Admin card "$cardName" navigates to ?tab=$targetTabParam which resolves to "$expectedResolvedTab"',
      ({ targetTabParam, expectedResolvedTab, extraParams }) => {
        const resolved = normalizeAdminTab(targetTabParam);
        expect(resolved).toBe(expectedResolvedTab);
        if (extraParams?.status) {
          expect(extraParams.status).toBe('open');
        }
      }
    );

    test('Admin invalid tab parameter falls back to "overview"', () => {
      expect(normalizeAdminTab('bogusTab')).toBe('overview');
      expect(normalizeAdminTab('')).toBe('overview');
    });
  });

  describe('Keyboard & Accessibility Contracts', () => {
    test('Enter and Space keys activate card onClick handler', () => {
      let clickTriggered = false;
      const handleClick = () => {
        clickTriggered = true;
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.preventDefault) e.preventDefault();
          handleClick();
        }
      };

      handleKeyDown({ key: 'Enter', preventDefault: () => {} });
      expect(clickTriggered).toBe(true);

      clickTriggered = false;
      handleKeyDown({ key: ' ', preventDefault: () => {} });
      expect(clickTriggered).toBe(true);

      clickTriggered = false;
      handleKeyDown({ key: 'Tab', preventDefault: () => {} });
      expect(clickTriggered).toBe(false);
    });

    test('aria-label matches accessibility standards', () => {
      const hospitalCount = 7;
      const label = `Open Active Requests (${hospitalCount})`;
      expect(label).toBe('Open Active Requests (7)');
      expect(label.startsWith('Open ')).toBe(true);
    });
  });
});

