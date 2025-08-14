import { auditLogger, AuditAction } from './auditLogger';
import { logger } from '../logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (userId: string, action: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class ClientRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private generateKey(userId: string, action: string, customGenerator?: (userId: string, action: string) => string): string {
    if (customGenerator) {
      return customGenerator(userId, action);
    }
    return `${userId}:${action}`;
  }

  async checkLimit(
    userId: string,
    action: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = this.generateKey(userId, action, config.keyGenerator);
    const now = Date.now();
    const windowEnd = now + config.windowMs;

    let bucket = this.store.get(key);
    
    // Create new bucket or reset if window expired
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 0, resetTime: windowEnd };
      this.store.set(key, bucket);
    }

    const remaining = Math.max(0, config.maxRequests - bucket.count);
    const allowed = bucket.count < config.maxRequests;

    if (!allowed) {
      // Log rate limit exceeded
      await auditLogger.logSuspicious(AuditAction.RATE_LIMIT_EXCEEDED, userId, {
        action,
        limit: config.maxRequests,
        window: config.windowMs,
        key
      });

      logger.warn('Rate limit exceeded', {
        operation: 'rate_limit',
        metadata: { userId, action, key, limit: config.maxRequests }
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.resetTime,
        retryAfter: bucket.resetTime - now
      };
    }

    bucket.count++;
    
    return {
      allowed: true,
      remaining: remaining - 1,
      resetTime: bucket.resetTime
    };
  }

  async recordRequest(
    userId: string,
    action: string,
    config: RateLimitConfig,
    success: boolean
  ): Promise<void> {
    // Only record if we should count this type of request
    if ((success && config.skipSuccessfulRequests) || 
        (!success && config.skipFailedRequests)) {
      return;
    }

    const key = this.generateKey(userId, action, config.keyGenerator);
    const bucket = this.store.get(key);
    
    if (bucket) {
      bucket.count++;
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Pre-configured rate limits for different actions
export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true // Only count failed attempts
  },
  kycSubmission: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3
  },
  tradeCreation: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10
  },
  profileUpdate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  },
  messagesSend: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  },
  apiKeyAccess: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20
  },
  sensitiveDataAccess: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50
  },
  bulkDataAccess: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5
  }
} satisfies Record<string, RateLimitConfig>;

export const rateLimiter = new ClientRateLimiter();

// Helper function to enforce rate limits
export async function enforceRateLimit(
  userId: string,
  action: keyof typeof rateLimitConfigs,
  customConfig?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const config = { ...rateLimitConfigs[action], ...customConfig };
  return rateLimiter.checkLimit(userId, action, config);
}

// Helper function to record successful/failed requests
export async function recordRateLimitedRequest(
  userId: string,
  action: keyof typeof rateLimitConfigs,
  success: boolean,
  customConfig?: Partial<RateLimitConfig>
): Promise<void> {
  const config = { ...rateLimitConfigs[action], ...customConfig };
  return rateLimiter.recordRequest(userId, action, config, success);
}