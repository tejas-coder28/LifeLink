const {
  getAiConfig,
  logStartupProvider,
  generateChatReply,
  buildSystemInstruction,
  formatHistoryForGemini,
  deduplicateActions,
} = require('../src/services/geminiService');
const { isGreeting, routeWithKeywords, FIXED_REFUSAL } = require('../src/services/keywordRouter');

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn(),
        },
      };
    }),
  };
});

const { GoogleGenAI } = require('@google/genai');

describe('Gemini Service & Fallback (Phase 4 & Refinements)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Greeting Recognition', () => {
    test('"yoo" and "hey there" are recognized as greetings', () => {
      expect(isGreeting('yoo')).toBe(true);
      expect(isGreeting('hey there')).toBe(true);
      expect(isGreeting('yo')).toBe(true);
      expect(isGreeting('sup')).toBe(true);
      expect(isGreeting('ok')).toBe(true);
      expect(isGreeting('okay')).toBe(true);
    });

    test('"this is which hospital" is NOT a greeting', () => {
      expect(isGreeting('this is which hospital')).toBe(false);
      expect(isGreeting('which hospital is open')).toBe(false);
      expect(isGreeting('this is an emergency')).toBe(false);
    });
  });

  describe('Environment Configuration & Placeholder Keys', () => {
    test('treats literal PASTE_YOUR_KEY_HERE as placeholder and uses keyword router', async () => {
      process.env.AI_API_KEY = 'PASTE_YOUR_KEY_HERE';
      process.env.AI_PROVIDER = 'gemini';

      const config = getAiConfig();
      expect(config.enabled).toBe(false);
      expect(config.reason).toBe('placeholder');

      const res = await generateChatReply('Where is my blood inventory?', [], {
        role: 'hospital',
      });
      expect(res.provider).toBe('keyword');
      expect(res.fallbackReason).toBe('placeholder');
      expect(GoogleGenAI).not.toHaveBeenCalled();
    });

    test('accepts GEMINI_API_KEY as alternate environment variable', () => {
      delete process.env.AI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-gemini-key';

      const config = getAiConfig();
      expect(config.enabled).toBe(true);
      expect(config.apiKey).toBe('valid-gemini-key');
    });

    test('logStartupProvider logs provider status line', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      process.env.AI_API_KEY = 'valid-key';
      process.env.AI_PROVIDER = 'gemini';
      delete process.env.AI_MODEL; // ensure default chain is used
      logStartupProvider();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI provider: gemini (model chain: gemini-3.8-flash → gemini-3.6-flash → gemini-3.5-flash-lite → gemini-3.1-flash-lite)')
      );

      process.env.AI_API_KEY = 'PASTE_YOUR_KEY_HERE';
      logStartupProvider();
      expect(consoleSpy).toHaveBeenCalledWith('AI provider: keyword-only (placeholder)');

      delete process.env.AI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      logStartupProvider();
      expect(consoleSpy).toHaveBeenCalledWith('AI provider: keyword-only (key missing)');

      consoleSpy.mockRestore();
    });
  });

  describe('Off-Topic Fixed Refusal in Both Providers', () => {
    test('"today virat kohli birthday??" gets fixed refusal in Provider A (keyword router)', async () => {
      const res = await routeWithKeywords('today virat kohli birthday??', { role: 'user' });
      expect(res.reply).toBe(FIXED_REFUSAL);
      expect(res.actions).toEqual([]);
      expect(res.suggestions).toHaveLength(3);
    });

    test('"today virat kohli birthday??" gets fixed refusal in Gemini path', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';

      // Gemini is mocked to return the refusal per system instructions
      const mockGenerateContent = jest.fn().mockResolvedValue({
        functionCalls: null,
        text: FIXED_REFUSAL,
      });
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const res = await generateChatReply('today virat kohli birthday??', [], { role: 'user' });
      expect(res.reply).toBe(FIXED_REFUSAL);
      expect(res.actions).toEqual([]);
      expect(res.provider).toBe('gemini');
    });
  });

  describe('Gemini Primary Execution & Tool Calling Loop', () => {
    test('key set + Gemini mocked: data question returns provider "gemini"', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';

      const mockGenerateContent = jest.fn();
      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      // Round 1: Gemini calls getHowToGuide
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [{ name: 'getHowToGuide', args: { topic: 'inventory' } }],
      });

      // Round 2: Gemini returns final answer text
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: null,
        text: 'Your hospital blood inventory can be managed in the Inventory Reserves tab.',
      });

      const res = await generateChatReply('Where is my blood inventory?', [], {
        role: 'hospital',
        userId: 'hosp-123',
      });

      expect(res.provider).toBe('gemini');
      expect(res.fallbackReason).toBeNull();
      expect(res.reply).toContain('Inventory Reserves tab');
      expect(res.actions).toHaveLength(1);
      expect(res.actions[0].tab).toBe('inventory');
    });

    test('Gemini throws -> falls back to provider "keyword" with fallbackReason', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';

      const error = new Error('403 Forbidden: API key invalid');
      error.status = 403;

      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockRejectedValue(error),
        },
      }));

      const res = await generateChatReply('How do I submit an emergency request?', [], {
        role: 'public',
      });

      expect(res.provider).toBe('keyword');
      expect(res.fallbackReason).toContain('403');
      expect(res.actions.length).toBeGreaterThan(0);
    });
  });

  describe('Model Fallback Chain (429 Quota Handling)', () => {
    test('HTTP 429 on first model retries second model and returns gemini provider', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';
      delete process.env.AI_MODEL;

      const quotaError = new Error('429 quota exceeded');
      quotaError.status = 429;

      const mockGenerateContent = jest.fn();
      // First call (gemini-3.8-flash) → quota exceeded
      mockGenerateContent.mockRejectedValueOnce(quotaError);
      // Second call (gemini-3.6-flash) → success
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: null,
        text: 'Here is your inventory data.',
      });

      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const res = await generateChatReply('How much O+ blood do we have?', [], {
        role: 'hospital',
        userId: 'hosp-456',
      });

      expect(res.provider).toBe('gemini');
      expect(res.reply).toContain('inventory');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('HTTP 429 on ALL models falls back to keyword router with correct fallbackReason', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';
      delete process.env.AI_MODEL;

      const quotaError = new Error('429 quota exceeded');
      quotaError.status = 429;

      const mockGenerateContent = jest.fn().mockRejectedValue(quotaError);

      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await generateChatReply('How many donors are online?', [], {
        role: 'admin',
      });

      expect(res.provider).toBe('keyword');
      expect(res.fallbackReason).toBe('all models quota exhausted');
      // 4 models in chain → 4 attempts
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);

      warnSpy.mockRestore();
    });

    test('non-429 error on first model immediately falls back to keyword (no retry)', async () => {
      process.env.AI_API_KEY = 'mock-key';
      process.env.AI_PROVIDER = 'gemini';
      delete process.env.AI_MODEL;

      const forbiddenError = new Error('403 Forbidden: bad key');
      forbiddenError.status = 403;

      const mockGenerateContent = jest.fn().mockRejectedValue(forbiddenError);

      GoogleGenAI.mockImplementation(() => ({
        models: { generateContent: mockGenerateContent },
      }));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await generateChatReply('Where is the inventory tab?', [], {
        role: 'hospital',
      });

      expect(res.provider).toBe('keyword');
      expect(res.fallbackReason).toContain('403');
      // Should only have tried once — no retry on non-429
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  describe('System Instruction & Format Helpers', () => {
    test('buildSystemInstruction incorporates role, user name, and refusal rule', () => {
      const instruction = buildSystemInstruction({ role: 'hospital', name: 'Metro Health' });
      expect(instruction).toContain('Metro Health');
      expect(instruction).toContain('hospital');
      expect(instruction).toContain(FIXED_REFUSAL);
    });

    test('formatHistoryForGemini maps roles accurately to user and model', () => {
      const history = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' },
      ];
      const formatted = formatHistoryForGemini(history);
      expect(formatted).toEqual([
        { role: 'user', parts: [{ text: 'hello' }] },
        { role: 'model', parts: [{ text: 'hi there' }] },
      ]);
    });

    test('deduplicateActions removes redundant actions with matching path and tab', () => {
      const actions = [
        { type: 'navigate', label: 'Inventory', path: '/hospital/dashboard', tab: 'inventory' },
        { type: 'navigate', label: 'Inventory Reserves', path: '/hospital/dashboard', tab: 'inventory' },
        { type: 'navigate', label: 'Demands', path: '/hospital/dashboard', tab: 'incoming-requests' },
      ];
      const deduped = deduplicateActions(actions);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].tab).toBe('inventory');
      expect(deduped[1].tab).toBe('incoming-requests');
    });
  });

  describe('Assistant Parity & Polish (Bugs A-D)', () => {
    const aiTools = require('../src/services/aiTools');
    const { handleGreeting } = require('../src/services/keywordRouter');

    test('Hospital greeting contains full hospital name (not just first word)', () => {
      const res = handleGreeting({ role: 'hospital', name: 'City General Hospital' });
      expect(res.reply).toContain('City General Hospital');
      expect(res.reply).not.toContain(', City.');
    });

    test('"where do I see requests?" -> navigation only (no data tool call)', async () => {
      const spy = jest.spyOn(aiTools, 'executeTool');
      const res = await routeWithKeywords('where do I see requests?', { role: 'donor' });

      expect(res.reply).toContain('You can find this under');
      expect(res.actions.length).toBeGreaterThan(0);
      expect(spy).toHaveBeenCalledWith('getHowToGuide', expect.anything(), expect.anything());
      expect(spy).not.toHaveBeenCalledWith('getOpenRequestsForMe', expect.anything(), expect.anything());
      spy.mockRestore();
    });

    test('"how many active requests?" (hospital, 0 active) -> "0 active requests" + New Blood Request button', async () => {
      const spy = jest.spyOn(aiTools, 'executeTool').mockImplementation(async (toolName) => {
        if (toolName === 'getActiveRequests') {
          return { status: 'active', isVerified: true, totalActive: 0, activeRequests: [] };
        }
        return {};
      });

      const res = await routeWithKeywords('how many active requests?', { role: 'hospital', userId: 'hosp-1' });

      expect(res.reply).toMatch(/^0 active requests/);
      expect(res.actions).toHaveLength(1);
      expect(res.actions[0].label).toBe('New Blood Request');
      expect(res.actions[0].path).toBe('/hospital/dashboard');

      spy.mockRestore();
    });

    test('Donor with one compatible open request -> reply starts "Yes, 1 patient is waiting", includes details and action buttons', async () => {
      const spy = jest.spyOn(aiTools, 'executeTool').mockImplementation(async (toolName) => {
        if (toolName === 'getOpenRequestsForMe') {
          return {
            donorBloodGroup: 'B+',
            totalMatchingRequests: 1,
            requests: [
              {
                id: 'req-1',
                patientName: 'Sarah Connor',
                bloodGroup: 'B+',
                unitsNeeded: 2,
                unitsFulfilled: 0,
                urgency: 'critical',
                hospitalName: 'Apollo Hospital',
                distanceKm: 3.5,
              },
            ],
          };
        }
        return {};
      });

      const res = await routeWithKeywords('find requests matching my blood group', {
        role: 'donor',
        userId: 'donor-1',
      });

      expect(res.reply).toMatch(/^Yes, 1 patient is waiting/);
      expect(res.reply).toContain('B+');
      expect(res.reply).toContain('2 units (≈ 900 ml)');
      expect(res.reply).toContain('Apollo Hospital');
      expect(res.reply).toContain('CRITICAL');
      expect(res.actions).toHaveLength(2);
      expect(res.actions[0].label).toBe('View Requests');
      expect(res.actions[0].path).toBe('/donor/dashboard');
      expect(res.actions[0].tab).toBe('requests');
      expect(res.actions[1].label).toBe('Review & Pledge');
      expect(res.actions[1].path).toBe('/donor/dashboard');
      expect(res.actions[1].tab).toBe('requests');

      spy.mockRestore();
    });
  });

  describe('Bug 1 & 2: LifeLink Questions, Phrasings, Capability, and Gemini Instruction', () => {
    const aiTools = require('../src/services/aiTools');

    const mockDonorRequestTool = () => {
      return jest.spyOn(aiTools, 'executeTool').mockImplementation(async (toolName) => {
        if (toolName === 'getOpenRequestsForMe') {
          return {
            donorBloodGroup: 'B+',
            totalMatchingRequests: 1,
            requests: [
              {
                id: 'req-101',
                patientName: 'John Connor',
                bloodGroup: 'B+',
                unitsNeeded: 2,
                unitsFulfilled: 0,
                urgency: 'high',
                hospitalName: 'City General Hospital',
                distanceKm: 2.1,
              },
            ],
          };
        }
        return {};
      });
    };

    test('"is there any request ?" -> Yes, 1 patient is waiting with [View Requests] and [Review & Pledge]', async () => {
      const spy = mockDonorRequestTool();
      const res = await routeWithKeywords('is there any request ?', { role: 'donor', userId: 'd-1' });

      expect(res.reply).toBe('Yes, 1 patient is waiting for your blood type: B+ needs 2 units (≈ 900 ml) at City General Hospital (urgency: HIGH). One donation gives 1 unit (≈ 450 ml).');
      expect(res.actions).toHaveLength(2);
      expect(res.actions[0].label).toBe('View Requests');
      expect(res.actions[1].label).toBe('Review & Pledge');
      expect(spy).toHaveBeenCalledWith('getOpenRequestsForMe', expect.anything(), expect.anything());
      spy.mockRestore();
    });

    test('"any requests" -> maps to data tool and starts with "Yes, 1 patient is waiting"', async () => {
      const spy = mockDonorRequestTool();
      const res = await routeWithKeywords('any requests', { role: 'donor', userId: 'd-1' });

      expect(res.reply).toMatch(/^Yes, 1 patient is waiting/);
      expect(res.reply).toContain('City General Hospital');
      expect(spy).toHaveBeenCalledWith('getOpenRequestsForMe', expect.anything(), expect.anything());
      spy.mockRestore();
    });

    test('"does anyone need blood" -> maps to data tool and starts with "Yes, 1 patient is waiting"', async () => {
      const spy = mockDonorRequestTool();
      const res = await routeWithKeywords('does anyone need blood', { role: 'donor', userId: 'd-1' });

      expect(res.reply).toMatch(/^Yes, 1 patient is waiting/);
      expect(spy).toHaveBeenCalledWith('getOpenRequestsForMe', expect.anything(), expect.anything());
      spy.mockRestore();
    });

    test('"any patients?" -> maps to data tool and starts with "Yes, 1 patient is waiting"', async () => {
      const spy = mockDonorRequestTool();
      const res = await routeWithKeywords('any patients?', { role: 'donor', userId: 'd-1' });

      expect(res.reply).toMatch(/^Yes, 1 patient is waiting/);
      expect(spy).toHaveBeenCalledWith('getOpenRequestsForMe', expect.anything(), expect.anything());
      spy.mockRestore();
    });

    test('"write me a poem" -> fixed refusal', async () => {
      const res = await routeWithKeywords('write me a poem', { role: 'donor' });
      expect(res.reply).toBe(FIXED_REFUSAL);
      expect(res.actions).toEqual([]);
    });

    test('"hmm what can you do" -> capability reply listing what user role can ask', async () => {
      const res = await routeWithKeywords('hmm what can you do', { role: 'donor' });
      expect(res.reply).not.toBe(FIXED_REFUSAL);
      expect(res.reply).toContain('I can help you');
      expect(res.reply).toContain('eligibility');
      expect(res.suggestions.length).toBeGreaterThan(0);
    });

    test('Zero open requests matching blood group -> "No open requests match your blood group right now."', async () => {
      const spy = jest.spyOn(aiTools, 'executeTool').mockImplementation(async (toolName) => {
        if (toolName === 'getOpenRequestsForMe') {
          return { donorBloodGroup: 'O-', totalMatchingRequests: 0, requests: [] };
        }
        return {};
      });

      const res = await routeWithKeywords('is there any request ?', { role: 'donor', userId: 'd-2' });
      expect(res.reply).toBe('No open requests match your blood group right now.');
      expect(res.actions).toHaveLength(1);
      expect(res.actions[0].label).toBe('View Requests');
      spy.mockRestore();
    });

    test('Gemini system instruction explicitly designates short/sloppy queries as in scope', () => {
      const instruction = buildSystemInstruction({ role: 'donor', name: 'John Doe' });
      expect(instruction).toContain(
        'Short or sloppy questions about requests, patients, donors, blood, stock or the app are IN SCOPE. Call the relevant tool and lead with the count. Only return OUT_OF_SCOPE when the message has no connection to LifeLink.'
      );
    });
  });
});
