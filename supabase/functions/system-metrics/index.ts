import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { tokenPriceCache, apiResponseCache, staticDataCache } from '../_shared/cacheManager.ts';

serve(async (req) => {
  const logger = new EdgeLogger('system-metrics');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('System metrics request received');

    // Get memory usage if available
    let memoryUsage = null;
    try {
      if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
        const usage = Deno.memoryUsage();
        memoryUsage = {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
          usagePercent: Math.round(usage.heapUsed / usage.heapTotal * 10000) / 100
        };
      }
    } catch {
      // Memory usage not available
    }

    // Get cache statistics
    const cacheStats = {
      tokenPriceCache: tokenPriceCache.getStats(),
      apiResponseCache: apiResponseCache.getStats(),
      staticDataCache: staticDataCache.getStats()
    };

    // Calculate aggregate cache metrics
    const totalCacheSize = Object.values(cacheStats).reduce((sum, stats) => sum + stats.size, 0);
    const totalCacheHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits, 0);
    const totalCacheMisses = Object.values(cacheStats).reduce((sum, stats) => sum + stats.misses, 0);
    const overallHitRate = totalCacheHits / Math.max(1, totalCacheHits + totalCacheMisses);

    // Environment info (without sensitive values)
    const environmentInfo = {
      hasApiKeys: {
        '1inch': !!Deno.env.get('1INCH_API_KEY'),
        'coinmarketcap': !!Deno.env.get('COINMARKETCAP_API_KEY'),
        'resend': !!Deno.env.get('RESEND_API_KEY'),
        'sumsub': !!Deno.env.get('SUMSUB_APP_TOKEN'),
        'walletconnect': !!Deno.env.get('WALLETCONNECT_PROJECT_ID')
      },
      hasSupabaseConfig: {
        'url': !!Deno.env.get('SUPABASE_URL'),
        'anonKey': !!Deno.env.get('SUPABASE_ANON_KEY'),
        'serviceKey': !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      }
    };

    // Performance metrics
    const performanceMetrics = {
      timestamp: Date.now(),
      uptime: Date.now(), // Edge functions don't have persistent uptime, but we can track request time
      memoryUsage,
      cache: {
        individual: cacheStats,
        aggregate: {
          totalSize: totalCacheSize,
          totalHits: totalCacheHits,
          totalMisses: totalCacheMisses,
          hitRate: overallHitRate,
          hitRatePercent: Math.round(overallHitRate * 10000) / 100
        }
      },
      environment: environmentInfo
    };

    logger.info('System metrics collected', {
      operation: 'metrics_collection',
      metadata: {
        memoryAvailable: !!memoryUsage,
        cacheHitRate: performanceMetrics.cache.aggregate.hitRatePercent,
        totalCacheEntries: totalCacheSize
      }
    });

    return responseBuilder.success(performanceMetrics);

  } catch (error) {
    logger.apiError('system_metrics', error as Error, { operation: 'metrics_collection_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'system_metrics' },
      'METRICS_COLLECTION_FAILED'
    );
  }
});