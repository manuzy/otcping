export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  userId?: string;
  component?: string;
  operation?: string;
  metadata?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: Date;
  error?: Error;
}

class Logger {
  private currentLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.currentLevel = import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? JSON.stringify(entry.context) : '';
    return `[${timestamp}] ${level}: ${entry.message} ${context}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      error
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, error);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, error);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, error);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, error);
        break;
    }

    // In production, you might want to send errors to an external service
    if (level === LogLevel.ERROR && import.meta.env.PROD) {
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // TODO: Implement external monitoring service integration
    // e.g., Sentry, LogRocket, etc.
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Helper methods for common operations
  apiCall(operation: string, endpoint: string, context?: Partial<LogContext>) {
    this.debug(`API Call: ${operation}`, {
      ...context,
      operation,
      metadata: { endpoint }
    });
  }

  apiSuccess(operation: string, context?: Partial<LogContext>) {
    this.info(`API Success: ${operation}`, {
      ...context,
      operation
    });
  }

  apiError(operation: string, error: Error, context?: Partial<LogContext>) {
    this.error(`API Error: ${operation}`, {
      ...context,
      operation
    }, error);
  }

  userAction(action: string, context?: Partial<LogContext>) {
    this.info(`User Action: ${action}`, {
      ...context,
      operation: action
    });
  }

  authEvent(event: string, context?: Partial<LogContext>) {
    this.info(`Auth Event: ${event}`, {
      ...context,
      operation: event
    });
  }

  performance(operation: string, duration: number, context?: Partial<LogContext>) {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      metadata: { duration }
    });
  }

  security(message: string, context?: Partial<LogContext>) {
    this.warn(`Security Event: ${message}`, {
      ...context,
      operation: 'security_event'
    });
  }
}

export const logger = new Logger();