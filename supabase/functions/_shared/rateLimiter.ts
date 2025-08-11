// Rate limiting utilities for Supabase Edge Functions

export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => this.getClientIP(req) || 'unknown',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };
  }

  // Extract client IP from request
  private getClientIP(req: Request): string | null {
    // Check various headers for the client IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'true-client-ip',   // Cloudflare Enterprise
      'x-cluster-client-ip'
    ];

    for (const header of headers) {
      const value = req.headers.get(header);
      if (value) {
        // Take the first IP if multiple are present
        return value.split(',')[0].trim();
      }
    }

    return null;
  }

  // Check if request is allowed
  checkLimit(req: Request): RateLimitResult {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;

    // Clean up expired entries
    this.cleanup(windowStart);

    // Get or create entry for this key
    let entry = this.store.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowSizeMs
      };
    }

    // Check if limit exceeded
    const allowed = entry.count < this.config.maxRequests;
    
    if (allowed) {
      entry.count++;
      this.store.set(key, entry);
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalHits: entry.count
    };
  }

  // Record a request (for post-processing rate limiting)
  recordRequest(req: Request, success: boolean): void {
    if (success && this.config.skipSuccessfulRequests) return;
    if (!success && this.config.skipFailedRequests) return;

    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    
    let entry = this.store.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: now + this.config.windowSizeMs
      };
    } else {
      entry.count++;
    }

    this.store.set(key, entry);
  }

  // Clean up expired entries
  private cleanup(cutoff: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= cutoff) {
        this.store.delete(key);
      }
    }
  }

  // Create rate limit headers for response
  createHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'X-RateLimit-Window': Math.ceil(this.config.windowSizeMs / 1000).toString()
    };
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimitConfigs = {
  // Strict rate limiting for expensive operations
  strict: {
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  
  // Moderate rate limiting for normal API calls
  moderate: {
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },
  
  // Lenient rate limiting for read operations
  lenient: {
    windowSizeMs: 60 * 1000, // 1 minute
    maxRequests: 300
  },
  
  // Per-hour rate limiting for resource-intensive operations
  hourly: {
    windowSizeMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000
  }
};