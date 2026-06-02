const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('../config/environment');

// Custom security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.vercel.app"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'API rate limit exceeded. Please try again later.',
  },
});

// Admin panel brute force protection
const adminBruteForceProtection = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many admin login attempts. Account temporarily locked for 1 hour.',
  },
});

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length']);
  if (contentLength > 10485760) { // 10MB
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum size is 10MB.',
    });
  }
  next();
};

// SQL Injection prevention
const sqlInjectionPrevention = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
    /('|"|;|--|\/\*|\*\/|@@|@)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (let key in obj) {
      if (checkValue(key) || checkValue(obj[key])) {
        return true;
      }
    }
    return false;
  };

  if (checkObject(req.query) || checkObject(req.body)) {
    return res.status(403).json({
      success: false,
      message: 'Malicious request detected',
    });
  }

  next();
};

// Request logging for suspicious activity
const suspiciousActivityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempt
    /etc\/passwd/i, // System file access
    /eval\(/i, // Code injection
    /union.*select/i, // SQL injection
  ];

  const url = req.url.toLowerCase();
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    console.warn(`Suspicious activity detected from IP: ${req.ip}, URL: ${req.url}`);
    // In production, you might want to log this to a security monitoring service
  }

  next();
};

module.exports = {
  securityHeaders,
  authLimiter,
  generalLimiter,
  apiLimiter,
  adminBruteForceProtection,
  requestSizeLimiter,
  sqlInjectionPrevention,
  suspiciousActivityLogger,
  mongoSanitize: mongoSanitize(),
  xssPrevention: xss(),
  hppProtection: hpp(),
};