import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { HealthMonitor, commonHealthChecks } from '../_shared/healthMonitor.ts';
import { tokenPriceCache, apiResponseCache, staticDataCache } from '../_shared/cacheManager.ts';

serve(async (req) => {
  const logger = new EdgeLogger('health-check');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
  const healthMonitor = new HealthMonitor();

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('Health check request received');

    // Register health checks
    healthMonitor.registerCheck(
      commonHealthChecks.environmentCheck([
        '1INCH_API_KEY',
        'COINMARKETCAP_API_KEY',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'RESEND_API_KEY'
      ])
    );

    healthMonitor.registerCheck(
      commonHealthChecks.memoryCheck(80) // 80% memory threshold
    );

    healthMonitor.registerCheck(
      commonHealthChecks.externalApiCheck(
        'coinmarketcap',
        'https://pro-api.coinmarketcap.com',
        3000
      )
    );

    healthMonitor.registerCheck(
      commonHealthChecks.externalApiCheck(
        '1inch',
        'https://api.1inch.dev',
        3000
      )
    );

    // Custom cache health check
    healthMonitor.registerCheck({
      name: 'cache_health',
      check: async () => {
        const tokenCacheStats = tokenPriceCache.getStats();
        const apiCacheStats = apiResponseCache.getStats();
        const staticCacheStats = staticDataCache.getStats();

        const totalSize = tokenCacheStats.size + apiCacheStats.size + staticCacheStats.size;
        const totalHitRate = (tokenCacheStats.hits + apiCacheStats.hits + staticCacheStats.hits) / 
                           Math.max(1, tokenCacheStats.hits + tokenCacheStats.misses + 
                                     apiCacheStats.hits + apiCacheStats.misses + 
                                     staticCacheStats.hits + staticCacheStats.misses);

        if (totalHitRate > 0.7) {
          return {
            status: 'healthy',
            message: `Cache performance is good (${(totalHitRate * 100).toFixed(1)}% hit rate)`,
            details: {
              totalSize,
              hitRate: totalHitRate,
              tokenCache: tokenCacheStats,
              apiCache: apiCacheStats,
              staticCache: staticCacheStats
            }
          };
        } else if (totalHitRate > 0.4) {
          return {
            status: 'degraded',
            message: `Cache performance is suboptimal (${(totalHitRate * 100).toFixed(1)}% hit rate)`,
            details: { totalSize, hitRate: totalHitRate }
          };
        } else {
          return {
            status: 'unhealthy',
            message: `Cache performance is poor (${(totalHitRate * 100).toFixed(1)}% hit rate)`,
            details: { totalSize, hitRate: totalHitRate }
          };
        }
      }
    });

    // Function-specific health check
    healthMonitor.registerCheck({
      name: 'edge_functions',
      critical: true,
      check: async () => {
        try {
          // Test our own functions by checking if they respond to OPTIONS requests
          const functionsToTest = [
            'get-token-price',
            'create-1inch-order',
            'submit-1inch-order',
            'send-message-notification'
          ];

          const testResults = await Promise.allSettled(
            functionsToTest.map(async (funcName) => {
              const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${funcName}`, {
                method: 'OPTIONS',
                headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` }
              });
              return { funcName, ok: response.ok, status: response.status };
            })
          );

          const results = testResults.map(result => 
            result.status === 'fulfilled' ? result.value : { funcName: 'unknown', ok: false, status: 0 }
          );

          const healthyFunctions = results.filter(r => r.ok).length;
          const totalFunctions = results.length;

          if (healthyFunctions === totalFunctions) {
            return {
              status: 'healthy',
              message: `All ${totalFunctions} edge functions are responding`,
              details: { healthy: healthyFunctions, total: totalFunctions, results }
            };
          } else if (healthyFunctions > totalFunctions * 0.5) {
            return {
              status: 'degraded',
              message: `${healthyFunctions}/${totalFunctions} edge functions are responding`,
              details: { healthy: healthyFunctions, total: totalFunctions, results }
            };
          } else {
            return {
              status: 'unhealthy',
              message: `Only ${healthyFunctions}/${totalFunctions} edge functions are responding`,
              details: { healthy: healthyFunctions, total: totalFunctions, results }
            };
          }
        } catch (error) {
          return {
            status: 'unhealthy',
            message: 'Failed to check edge function health',
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      }
    });

    // Run all health checks
    const healthResult = await healthMonitor.checkHealth();

    logger.info('Health check completed', {
      operation: 'health_check_complete',
      overallStatus: healthResult.status,
      summary: healthResult.summary
    });

    // Return appropriate HTTP status based on health
    const httpStatus = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;

    return new Response(
      JSON.stringify({
        success: true,
        data: healthResult,
        timestamp: new Date().toISOString()
      }),
      {
        status: httpStatus,
        headers: { 
          ...defaultCorsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error) {
    logger.apiError('health_check', error as Error, { operation: 'health_check_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'health_check' },
      'HEALTH_CHECK_FAILED'
    );
  }
});