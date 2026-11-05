const { z } = require('zod');
const aiService = require('../services/ai.service');
const { isGreeting, handleGreeting, routeWithKeywords } = require('../services/keywordRouter');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const chatRequestSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message is required and cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(500),
      })
    )
    .max(10)
    .optional(),
  currentPath: z.string().max(200).optional(),
});

const generateInsight = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const insight = await aiService.generateSystemInsight(prompt);
    return sendSuccess(res, 'AI Insight generated successfully', insight, 201);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getInsights = async (req, res, next) => {
  try {
    const insights = await aiService.getLatestInsights();
    return sendSuccess(res, 'AI Insights history fetched', insights);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const chat = async (req, res, next) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        parseResult.error.errors[0]?.message || 'Invalid chat request',
        400,
        parseResult.error.errors
      );
    }

    const { message, history, currentPath } = parseResult.data;

    // Resolve user context from authenticated request
    const user = req.user;
    const userContext = {
      userId: user?._id || user?.id,
      name: user?.name,
      role: user?.accountType || user?.role || 'public',
      hospitalId: user?.hospitalId,
      currentPath,
    };

    // 1. Greeting shortcut: return immediately without model call or data query
    if (isGreeting(message)) {
      const greetingResponse = handleGreeting(userContext);
      return sendSuccess(res, 'Chat response generated', greetingResponse);
    }

    // 2. Dispatch to Provider:
    // In Phase 3: Provider A (keyword router).
    // In Phase 4: Google Gemini (Provider B) with seamless fallback to Provider A.
    let response;
    if (aiService.generateChatReply) {
      response = await aiService.generateChatReply(message, history, userContext);
    } else {
      response = await routeWithKeywords(message, userContext);
    }

    return sendSuccess(res, 'Chat response generated', response);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = {
  generateInsight,
  getInsights,
  chat,
};
