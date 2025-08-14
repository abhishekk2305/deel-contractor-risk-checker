import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { redis } from '../lib/redis';
import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('rate-limit');

// Create a Redis-based rate limiter
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: any) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => {
      // Use user ID if authenticated, otherwise IPv6-compatible IP
      return req.user?.id || ipKeyGenerator(req);
    }),
    store: {
      incr: async (key: string) => {
        try {
          const current = await redis.incr(`rate_limit:${key}`);
          if (current === 1) {
            await redis.expire(`rate_limit:${key}`, Math.ceil(options.windowMs / 1000));
          }
          return { totalHits: current, timeToExpire: undefined };
        } catch (error) {
          logger.error({ error, key }, 'Rate limit store error');
          return { totalHits: 0, timeToExpire: undefined };
        }
      },
      decrement: async (key: string) => {
        try {
          await redis.decr(`rate_limit:${key}`);
        } catch (error) {
          logger.error({ error, key }, 'Rate limit decrement error');
        }
      },
      resetKey: async (key: string) => {
        try {
          await redis.del(`rate_limit:${key}`);
        } catch (error) {
          logger.error({ error, key }, 'Rate limit reset error');
        }
      },
    },
  });
};

// General API rate limit
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

// Risk check rate limit (more restrictive)
export const riskCheckRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 risk checks per minute
  message: 'Too many risk assessments, please wait before trying again.',
});

// PDF generation rate limit
export const pdfRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 PDF generations per 5 minutes
  message: 'Too many PDF generation requests, please wait before trying again.',
});

// Admin operations rate limit
export const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 admin operations per minute
});
