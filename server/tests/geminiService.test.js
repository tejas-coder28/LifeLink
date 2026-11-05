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
      logStartupProvider();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AI provider: gemini (model gemini-2.5-flash)'));

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
});
