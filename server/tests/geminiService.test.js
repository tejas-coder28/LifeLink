const {
  generateChatReply,
  buildSystemInstruction,
  formatHistoryForGemini,
  deduplicateActions,
} = require('../src/services/geminiService');
const { FIXED_REFUSAL } = require('../src/services/keywordRouter');

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

describe('Gemini Service & Fallback (Phase 4)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

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

  test('fast failsafe returns fixed refusal on off-topic questions without invoking model', async () => {
    process.env.AI_API_KEY = 'mock-key';
    const res = await generateChatReply('What is the weather today in Tokyo?', [], { role: 'user' });
    expect(res.reply).toBe(FIXED_REFUSAL);
    expect(res.actions).toEqual([]);
    expect(res.provider).toBe('keyword');
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  test('falls back seamlessly to Provider A when AI_PROVIDER=keyword', async () => {
    process.env.AI_PROVIDER = 'keyword';
    process.env.AI_API_KEY = 'mock-key';

    const res = await generateChatReply('How do I submit an emergency request?', [], { role: 'public' });
    expect(res.provider).toBe('keyword');
    expect(res.actions.length).toBeGreaterThan(0);
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  test('falls back seamlessly to Provider A when API key is missing', async () => {
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const res = await generateChatReply('How do I submit an emergency request?', [], { role: 'public' });
    expect(res.provider).toBe('keyword');
    expect(res.actions.length).toBeGreaterThan(0);
  });

  test('executes Gemini function calling loop and returns model answer', async () => {
    process.env.AI_API_KEY = 'mock-key';
    process.env.AI_PROVIDER = 'gemini';

    const mockGenerateContent = jest.fn();
    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));

    // Round 1: Model calls getHowToGuide
    mockGenerateContent.mockResolvedValueOnce({
      functionCalls: [
        {
          name: 'getHowToGuide',
          args: { topic: 'inventory' },
        },
      ],
    });

    // Round 2: Model returns text
    mockGenerateContent.mockResolvedValueOnce({
      functionCalls: null,
      text: 'You can check your blood bank reserves in the Inventory Reserves tab.',
    });

    const res = await generateChatReply('Where is my blood inventory?', [], {
      role: 'hospital',
      userId: 'hosp-123',
    });

    expect(res.provider).toBe('gemini');
    expect(res.reply).toContain('Inventory Reserves tab');
    expect(res.actions).toEqual([
      {
        type: 'navigate',
        label: 'Inventory Reserves',
        path: '/hospital/dashboard',
        tab: 'inventory',
      },
    ]);
  });

  test('falls back to Provider A on Gemini API error without crashing', async () => {
    process.env.AI_API_KEY = 'mock-key';
    process.env.AI_PROVIDER = 'gemini';

    GoogleGenAI.mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error('API quota exceeded')),
      },
    }));

    const res = await generateChatReply('How do I submit an emergency request?', [], { role: 'public' });
    expect(res.provider).toBe('keyword');
    expect(res.actions.length).toBeGreaterThan(0);
  });
});
