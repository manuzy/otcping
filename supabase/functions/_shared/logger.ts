// Shared logging utilities for Supabase Edge Functions

export interface LogContext {
  userId?: string;
  operation?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  function: string;
  message: string;
  context?: LogContext;
  processingTimeMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class EdgeLogger {
  private functionName: string;
  private startTime: number;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.startTime = Date.now();
  }

  private log(level: LogEntry['level'], message: string, context?: LogContext, error?: Error): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      context,
      processingTimeMs: Date.now() - this.startTime
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  // Convenience methods for common operations
  apiCall(operation: string, endpoint: string, context?: Partial<LogContext>): void {
    this.info(`API call: ${operation}`, {
      ...context,
      operation,
      metadata: { endpoint, ...context?.metadata }
    });
  }

  apiSuccess(operation: string, context?: Partial<LogContext>): void {
    this.info(`API success: ${operation}`, {
      ...context,
      operation
    });
  }

  apiError(operation: string, error: Error, context?: Partial<LogContext>): void {
    this.error(`API error: ${operation}`, {
      ...context,
      operation
    }, error);
  }

  userAction(action: string, context?: Partial<LogContext>): void {
    this.info(`User action: ${action}`, {
      ...context,
      operation: action
    });
  }

  performance(operation: string, duration: number, context?: Partial<LogContext>): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      metadata: { durationMs: duration, ...context?.metadata }
    });
  }

  authEvent(event: string, context?: Partial<LogContext>): void {
    this.info(`Auth event: ${event}`, {
      ...context,
      operation: event
    });
  }
}