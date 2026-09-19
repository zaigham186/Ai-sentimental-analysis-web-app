const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Security middleware
 */

// Helmet - Security headers
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 10, // 10 attempts in non-test
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for AI/NLP endpoints (resource intensive)
const nlpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.nodeEnv === 'test' ? 1000 : 30, // 30 requests per minute
  message: {
    success: false,
    message: 'AI analysis rate limit exceeded. Please wait a moment before submitting more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  // Express json() middleware handles size limits
  next();
};

module.exports = {
  helmetMiddleware,
  limiter,
  authLimiter,
  nlpLimiter,
  requestSizeLimiter
};

