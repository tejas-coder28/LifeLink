const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const aiRoutes = require('../src/routes/ai.routes');
const { isGreeting, isOffTopic, FIXED_REFUSAL } = require('../src/services/keywordRouter');

const JWT_SECRET = process.env.JWT_SECRET || 'lifelink_secret_jwt_key_2026';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRoutes);
  return app;
}

describe('AI Chat Endpoint & Provider A (Phase 3)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('Greeting Shortcut & Off-Topic Recognition', () => {
    test('isGreeting identifies greetings and thanks accurately', () => {
      expect(isGreeting('hi')).toBe(true);
      expect(isGreeting('Hello!')).toBe(true);
      expect(isGreeting('hey')).toBe(true);
      expect(isGreeting('thanks')).toBe(true);
      expect(isGreeting('Thank you so much')).toBe(true);
      expect(isGreeting('help')).toBe(true);
      expect(isGreeting('what can you do?')).toBe(true);
      expect(isGreeting('how many units of O+ do we have?')).toBe(false);
    });

    test('isOffTopic identifies non-LifeLink queries', () => {
      expect(isOffTopic('What is the weather in Delhi today?')).toBe(true);
      expect(isOffTopic('Who won the cricket world cup?')).toBe(true);
      expect(isOffTopic('Write a Python script to sort a list')).toBe(true);
      expect(isOffTopic('What is 25 * 40?')).toBe(true);
      expect(isOffTopic('Tell me a funny joke')).toBe(true);
      expect(isOffTopic('Who is the president of the US?')).toBe(true);
      expect(isOffTopic('How do I request emergency blood?')).toBe(false);
      expect(isOffTopic('Check hospital inventory')).toBe(false);
    });
  });

  describe('POST /api/ai/chat Validation & Greeting Handling', () => {
    test('rejects empty message with 400', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects messages longer than 500 characters with 400', async () => {
      const longMessage = 'A'.repeat(501);
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: longMessage });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('greeting returns immediate role greeting without canned platform insight', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Welcome to LifeLink');
      expect(res.body.data.reply).not.toContain('Emergency Donor Network & Supply Line Intelligence');
      expect(res.body.data.suggestions).toHaveLength(3);
      expect(res.body.data.actions).toEqual([]);
      expect(res.body.data.provider).toBe('keyword');
    });

    test('off-topic queries return fixed refusal string and suggestions', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Who is your favorite football player, Messi or Ronaldo?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBe(FIXED_REFUSAL);
      expect(res.body.data.actions).toEqual([]);
      expect(res.body.data.suggestions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Authenticated Role Responses via Provider A', () => {
    test('public user asking for emergency request gets navigation action', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'How do I submit an emergency request?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actions.length).toBeGreaterThan(0);
      expect(res.body.data.actions[0]).toEqual({
        type: 'navigate',
        label: 'Emergency Request',
        path: '/emergency-request',
      });
    });
  });
});
