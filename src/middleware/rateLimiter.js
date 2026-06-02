const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

class RateLimiter {
  // General API rate limiter
  static generalLimiter() {
    return rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind proxy
        return req.headers['x-forwarded-for'] || req.ip;
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
      },
      handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  // Strict limiter for authentication routes
  static authLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 attempts per window
      message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful requests
      keyGenerator: (req) => {
        // Combine IP and email for better tracking
        const email = req.body.email || 'unknown';
        const ip = req.headers['x-forwarded-for'] || req.ip;
        return `${ip}-${email}`;
      },
      handler: (req, res) => {
        console.warn(`Auth rate limit exceeded for: ${req.body.email || 'unknown'}`);
        res.status(429).json({
          success: false,
          message: 'Too many login attempts. Your account is temporarily locked for 15 minutes.',
        });
      }
    });
  }

  // Admin panel rate limiter (very strict)
  static adminLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // 5 attempts per hour
      message: {
        success: false,
        message: 'Too many admin login attempts. Please try again after 1 hour.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip;
      },
      handler: (req, res) => {
        console.error(`Admin brute force attempt from IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Access temporarily blocked due to multiple failed attempts.',
        });
      }
    });
  }

  // API key limiter for service-to-service communication
  static apiKeyLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
      message: {
        success: false,
        message: 'API rate limit exceeded.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.headers['x-api-key'] || req.ip;
      },
      handler: (req, res) => {
        console.warn(`API key rate limit exceeded: ${req.headers['x-api-key']}`);
        res.status(429).json({
          success: false,
          message: 'API quota exceeded. Please contact support for higher limits.',
        });
      }
    });
  }

  // Movie streaming limiter
  static streamingLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute for streaming
      message: {
        success: false,
        message: 'Streaming rate limit exceeded.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user ? req.user.id : req.ip;
      },
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'Please wait before requesting more streams.',
        });
      }
    });
  }

  // Dynamic rate limiter based on user tier
  static dynamicLimiter() {
    return (req, res, next) => {
      let maxRequests = 100; // Default for anonymous users
      let windowMs = 15 * 60 * 1000; // 15 minutes

      if (req.user) {
        // Authenticated users get higher limits
        maxRequests = 300;
        windowMs = 15 * 60 * 1000;
      }

      if (req.admin) {
        // Admins get highest limits
        maxRequests = 1000;
        windowMs = 15 * 60 * 1000;
      }

      const limiter = rateLimit({
        windowMs,
        max: maxRequests,
        message: {
          success: false,
          message: 'Rate limit exceeded.',
        },
        keyGenerator: (req) => {
          return req.user?.id || req.admin?.id || req.ip;
        }
      });

      return limiter(req, res, next);
    };
  }

  // Burst limiter for sudden traffic spikes
  static burstLimiter() {
    let requestCounts = new Map();
    
    // Clean up old entries every 10 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of requestCounts.entries()) {
        if (now - data.timestamp > 1000) {
          requestCounts.delete(key);
        }
      }
    }, 10000);

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      
      if (!requestCounts.has(key)) {
        requestCounts.set(key, { count: 1, timestamp: now });
        return next();
      }

      const data = requestCounts.get(key);
      
      if (now - data.timestamp > 1000) {
        // Reset counter after 1 second
        requestCounts.set(key, { count: 1, timestamp: now });
        return next();
      }

      data.count++;

      if (data.count > 50) {
        // More than 50 requests per second
        console.warn(`Burst detected from IP: ${key}`);
        return res.status(429).json({
          success: false,
          message: 'Too many requests in short time. Please slow down.',
        });
      }

      return next();
    };
  }

  // Geographic rate limiter (if you need country-specific limits)
  static geoLimiter(countryLimits = {}) {
    return (req, res, next) => {
      // This would typically use a geo-IP service
      // For now, we'll use a basic implementation
      const country = req.headers['cf-ipcountry'] || 'UNKNOWN';
      const limit = countryLimits[country] || 100;
      
      const limiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: limit,
        keyGenerator: (req) => {
          return `${country}-${req.ip}`;
        }
      });

      return limiter(req, res, next);
    };
  }

  // Reset limiter for testing purposes
  static resetLimiter(key) {
    // Clear internal store
    if (global.rateLimitStore) {
      global.rateLimitStore.resetKey(key);
    }
  }
}

module.exports = RateLimiter;