// Caching utilities for Supabase Edge Functions

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  cleanupInterval: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0 };
  private lastCleanup: number = Date.now();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };
  }

  // Generate cache key from multiple parameters
  static generateKey(prefix: string, ...params: (string | number | boolean)[]): string {
    return `${prefix}:${params.map(p => String(p)).join(':')}`;
  }

  // Get value from cache
  get<T>(key: string): T | null {
    this.cleanup();
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  // Set value in cache
  set<T>(key: string, data: T, ttl?: number): void {
    this.cleanup();

    // If cache is full, remove oldest entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      key
    };

    this.cache.set(key, entry);
  }

  // Delete value from cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Get or set pattern (cache-aside)
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.config.cleanupInterval) {
      return;
    }

    const expiredKeys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    this.lastCleanup = now;
  }

  // Evict oldest entries when cache is full
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / Math.max(1, this.stats.hits + this.stats.misses),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }
}

// Pre-configured cache instances for common use cases
export const cacheConfigs = {
  // Short-term cache for API responses
  shortTerm: {
    defaultTtl: 30 * 1000, // 30 seconds
    maxSize: 100
  },
  
  // Medium-term cache for computed data
  mediumTerm: {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxSize: 500
  },
  
  // Long-term cache for static data
  longTerm: {
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200
  },
  
  // Price data cache (frequently updated)
  priceData: {
    defaultTtl: 60 * 1000, // 1 minute
    maxSize: 300
  }
};

// Global cache instances
export const tokenPriceCache = new MemoryCache(cacheConfigs.priceData);
export const apiResponseCache = new MemoryCache(cacheConfigs.mediumTerm);
export const staticDataCache = new MemoryCache(cacheConfigs.longTerm);