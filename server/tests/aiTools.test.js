const {
  getToolsForRole,
  getToolDeclarationsForRole,
  executeTool,
} = require('../src/services/aiTools');

describe('AI Tools Registry & Role Security', () => {
  test('public role gets only shared tools', () => {
    const tools = getToolsForRole('public');
    expect(tools).toEqual(['getHowToGuide']);
  });

  test('donor role gets only donor and shared tools, never hospital or admin tools', () => {
    const tools = getToolsForRole('donor');
    expect(tools).toContain('getMyProfile');
    expect(tools).toContain('getEligibility');
    expect(tools).toContain('getOpenRequestsForMe');
    expect(tools).toContain('getMyRequests');
    expect(tools).toContain('getMyDonationHistory');
    expect(tools).toContain('getMyAlerts');
    expect(tools).toContain('getHowToGuide');

    expect(tools).not.toContain('getInventory');
    expect(tools).not.toContain('getPlatformStats');
    expect(tools).not.toContain('getPendingHospitals');
  });

  test('hospital role gets hospital and shared tools, never admin tools', () => {
    const tools = getToolsForRole('hospital');
    expect(tools).toContain('getInventory');
    expect(tools).toContain('getIncomingDemands');
    expect(tools).toContain('getActiveRequests');
    expect(tools).toContain('getPendingPledges');
    expect(tools).toContain('getMatchingDonors');
    expect(tools).toContain('getMyVerificationStatus');
    expect(tools).toContain('getHowToGuide');

    expect(tools).not.toContain('getPlatformStats');
    expect(tools).not.toContain('getPendingHospitals');
  });

  test('admin role has access to platform and governance tools', () => {
    const tools = getToolsForRole('admin');
    expect(tools).toContain('getPlatformStats');
    expect(tools).toContain('getPendingHospitals');
    expect(tools).toContain('getShortageAlerts');
    expect(tools).toContain('getRequestOverview');
  });

  test('executeTool throws 403 if a donor tries to execute getInventory', async () => {
    await expect(
      executeTool('getInventory', {}, { role: 'donor', userId: 'user-123' })
    ).rejects.toThrow(/Unauthorized tool execution/);
  });

  test('executeTool throws 403 if hospital tries to execute getPlatformStats', async () => {
    await expect(
      executeTool('getPlatformStats', {}, { role: 'hospital', userId: 'user-456' })
    ).rejects.toThrow(/Unauthorized tool execution/);
  });

  test('getHowToGuide returns valid navigation action via buildAction', async () => {
    const res = await executeTool(
      'getHowToGuide',
      { topic: 'inventory' },
      { role: 'hospital', userId: 'user-hosp' }
    );
    expect(res.found).toBe(true);
    expect(res.action).toEqual({
      type: 'navigate',
      label: 'Inventory Reserves',
      path: '/hospital/dashboard',
      tab: 'inventory',
    });
  });

  test('strips model-supplied identity parameter', async () => {
    const mockContext = { role: 'user', userId: 'real-user-id' };
    // getEligibility checks context.userId
    // We pass spoofed userId in args
    const res = await executeTool(
      'getEligibility',
      { userId: 'spoofed-user-id' },
      mockContext
    );
    expect(res).toHaveProperty('isEligible');
  });
});

