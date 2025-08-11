// Performance monitoring utilities for Supabase Edge Functions

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage?: {
    used: number;
    total: number;
  };
  operationCounts: Record<string, number>;
  slowOperations: Array<{
    operation: string;
    duration: number;
    threshold: number;
  }>;
}

export interface OperationTiming {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private startTime: number;
  private operations: OperationTiming[] = [];
  private operationCounts: Record<string, number> = {};
  private slowThreshold: number;

  constructor(slowThreshold: number = 1000) {
    this.startTime = Date.now();
    this.slowThreshold = slowThreshold;
  }

  // Start timing an operation
  startOperation(operation: string, metadata?: Record<string, any>): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.operations.push({
      operation: operationId,
      startTime: Date.now(),
      metadata
    });

    // Increment operation count
    this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1;

    return operationId;
  }

  // End timing an operation
  endOperation(operationId: string): number {
    const operation = this.operations.find(op => op.operation === operationId);
    if (!operation) {
      return 0;
    }

    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;

    return operation.duration;
  }

  // Time a function execution
  async timeOperation<T>(
    operationName: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    const operationId = this.startOperation(operationName, metadata);
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = this.endOperation(operationId);
      return { result, duration };
    } catch (error) {
      this.endOperation(operationId);
      throw error;
    }
  }

  // Get current memory usage (if available in Deno)
  getMemoryUsage(): { used: number; total: number } | undefined {
    try {
      if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
        const usage = Deno.memoryUsage();
        return {
          used: usage.heapUsed,
          total: usage.heapTotal
        };
      }
    } catch {
      // Memory usage not available
    }
    return undefined;
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    const executionTime = Date.now() - this.startTime;
    const memoryUsage = this.getMemoryUsage();
    
    const slowOperations = this.operations
      .filter(op => op.duration && op.duration > this.slowThreshold)
      .map(op => ({
        operation: op.operation,
        duration: op.duration!,
        threshold: this.slowThreshold
      }));

    return {
      executionTime,
      memoryUsage,
      operationCounts: { ...this.operationCounts },
      slowOperations
    };
  }

  // Log performance summary
  logSummary(logger: any): void {
    const metrics = this.getMetrics();
    
    logger.performance('function_execution', metrics.executionTime, {
      metadata: {
        memoryUsage: metrics.memoryUsage,
        operationCounts: metrics.operationCounts,
        slowOperationCount: metrics.slowOperations.length
      }
    });

    // Log slow operations
    if (metrics.slowOperations.length > 0) {
      logger.warn('Slow operations detected', {
        operation: 'performance_warning',
        metadata: {
          slowOperations: metrics.slowOperations,
          threshold: this.slowThreshold
        }
      });
    }
  }
}