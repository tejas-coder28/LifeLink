const rateLimit = require('express-rate-limit');

const shouldSkip = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development' ||
  process.env.DISABLE_RATE_LIMIT === 'true' ||
  !process.env.NODE_ENV;

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter rate limiter for expensive AI Service endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 AI insights requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'AI Service rate limit exceeded. Please wait a few minutes before generating more insights.',
  },
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

// Role & IP aware rate limiter for AI Assistant chat endpoint (20 req/min)
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && (req.user._id || req.user.id)) {
      return `user_${req.user._id || req.user.id}`;
    }
    return req.ip || 'public_ip';
  },
  skip: (req) => process.env.DISABLE_RATE_LIMIT === 'true' || (process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true'),
  statusCode: 429,
  message: {
    success: false,
    message: 'Rate limit exceeded: maximum 20 chat requests per minute.',
  },
});

module.exports = {
  apiLimiter,
  aiLimiter,
  authLimiter,
  aiChatLimiter,
};
