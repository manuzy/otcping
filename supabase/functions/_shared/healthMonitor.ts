// Health monitoring utilities for Supabase Edge Functions

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthResult>;
  timeout?: number;
  critical?: boolean;
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  responseTime?: number;
}

export interface OverallHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: Record<string, HealthResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical_failures: number;
  };
}

export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthResult> = new Map();

  // Register a health check
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, {
      timeout: 5000, // 5 second default timeout
      critical: false,
      ...check
    });
  }

  // Run a single health check with timeout
  private async runCheck(check: HealthCheck): Promise<HealthResult> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<HealthResult>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout!)
      );

      const result = await Promise.race([
        check.check(),
        timeoutPromise
      ]);

      return {
        ...result,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  // Run all health checks
  async checkHealth(): Promise<OverallHealth> {
    const timestamp = Date.now();
    const results: Record<string, HealthResult> = {};
    
    // Run all checks concurrently
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      const result = await this.runCheck(check);
      this.lastResults.set(name, result);
      return [name, result] as const;
    });

    const checkResults = await Promise.allSettled(checkPromises);
    
    // Process results
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let criticalFailures = 0;

    for (const result of checkResults) {
      if (result.status === 'fulfilled') {
        const [name, healthResult] = result.value;
        results[name] = healthResult;
        
        const check = this.checks.get(name)!;
        
        switch (healthResult.status) {
          case 'healthy':
            healthy++;
            break;
          case 'degraded':
            degraded++;
            break;
          case 'unhealthy':
            unhealthy++;
            if (check.critical) {
              criticalFailures++;
            }
            break;
        }
      } else {
        // Check execution failed
        unhealthy++;
      }
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalFailures > 0) {
      overallStatus = 'unhealthy';
    } else if (unhealthy > 0 || degraded > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp,
      checks: results,
      summary: {
        total: this.checks.size,
        healthy,
        degraded,
        unhealthy,
        critical_failures: criticalFailures
      }
    };
  }

  // Get cached results (for quick status checks)
  getCachedResults(): Record<string, HealthResult> {
    const results: Record<string, HealthResult> = {};
    for (const [name, result] of this.lastResults.entries()) {
      results[name] = result;
    }
    return results;
  }
}

// Common health checks
export const commonHealthChecks = {
  // Check if an external API is reachable
  externalApiCheck: (name: string, url: string, timeout = 3000): HealthCheck => ({
    name: `external_api_${name}`,
    timeout,
    check: async (): Promise<HealthResult> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout - 100);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return {
            status: 'healthy',
            message: `${name} API is responding`,
            details: { status: response.status }
          };
        } else {
          return {
            status: 'degraded',
            message: `${name} API returned ${response.status}`,
            details: { status: response.status }
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `${name} API is unreachable`,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    }
  }),

  // Check environment variables
  environmentCheck: (requiredVars: string[]): HealthCheck => ({
    name: 'environment_variables',
    critical: true,
    check: async (): Promise<HealthResult> => {
      const missing = requiredVars.filter(varName => !Deno.env.get(varName));
      
      if (missing.length === 0) {
        return {
          status: 'healthy',
          message: 'All required environment variables are set',
          details: { checked: requiredVars.length }
        };
      } else {
        return {
          status: 'unhealthy',
          message: `Missing environment variables: ${missing.join(', ')}`,
          details: { missing }
        };
      }
    }
  }),

  // Memory usage check
  memoryCheck: (maxUsagePercent = 80): HealthCheck => ({
    name: 'memory_usage',
    check: async (): Promise<HealthResult> => {
      try {
        if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
          const usage = Deno.memoryUsage();
          const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;
          
          if (usagePercent < maxUsagePercent * 0.7) {
            return {
              status: 'healthy',
              message: `Memory usage is normal (${usagePercent.toFixed(1)}%)`,
              details: { usagePercent, heapUsed: usage.heapUsed, heapTotal: usage.heapTotal }
            };
          } else if (usagePercent < maxUsagePercent) {
            return {
              status: 'degraded',
              message: `Memory usage is elevated (${usagePercent.toFixed(1)}%)`,
              details: { usagePercent, heapUsed: usage.heapUsed, heapTotal: usage.heapTotal }
            };
          } else {
            return {
              status: 'unhealthy',
              message: `Memory usage is critical (${usagePercent.toFixed(1)}%)`,
              details: { usagePercent, heapUsed: usage.heapUsed, heapTotal: usage.heapTotal }
            };
          }
        } else {
          return {
            status: 'degraded',
            message: 'Memory usage monitoring not available'
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'Failed to check memory usage',
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    }
  })
};