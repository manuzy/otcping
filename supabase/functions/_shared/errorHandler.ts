// Shared error handling utilities for Supabase Edge Functions

import { EdgeLogger, LogContext } from './logger.ts';

export interface StandardErrorResponse {
  error: string;
  code?: string;
  details?: string;
  requestId?: string;
  timestamp: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class EdgeErrorHandler {
  private logger: EdgeLogger;
  private corsHeaders: Record<string, string>;

  constructor(logger: EdgeLogger, corsHeaders: Record<string, string>) {
    this.logger = logger;
    this.corsHeaders = corsHeaders;
  }

  // Create standardized error response
  createErrorResponse(
    error: Error | string,
    statusCode: number = 500,
    context?: LogContext,
    code?: string
  ): Response {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorResponse: StandardErrorResponse = {
      error: errorMessage,
      code,
      timestamp: new Date().toISOString()
    };

    this.logger.error('Request failed with error', context, typeof error === 'object' ? error : undefined);

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: { ...this.corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle Supabase-specific errors
  handleSupabaseError(error: any, operation: string, context?: LogContext): Response {
    let statusCode = 500;
    let userMessage = 'Internal server error';
    let errorCode = 'SUPABASE_ERROR';

    // Common Supabase error patterns
    if (error.code === 'PGRST116') {
      statusCode = 404;
      userMessage = 'Resource not found';
      errorCode = 'NOT_FOUND';
    } else if (error.code === '23505') {
      statusCode = 409;
      userMessage = 'Resource already exists';
      errorCode = 'CONFLICT';
    } else if (error.code === '23503') {
      statusCode = 400;
      userMessage = 'Invalid reference';
      errorCode = 'INVALID_REFERENCE';
    } else if (error.message?.includes('JWT')) {
      statusCode = 401;
      userMessage = 'Authentication failed';
      errorCode = 'AUTH_ERROR';
    }

    return this.createErrorResponse(
      userMessage,
      statusCode,
      { ...context, operation, metadata: { originalError: error.message } },
      errorCode
    );
  }

  // Handle external API errors
  handleExternalApiError(
    response: Response,
    apiName: string,
    context?: LogContext
  ): Response {
    let statusCode = 500;
    let userMessage = `${apiName} service error`;
    let errorCode = `${apiName.toUpperCase()}_ERROR`;

    if (response.status === 400) {
      statusCode = 400;
      userMessage = `Invalid request to ${apiName}`;
    } else if (response.status === 401) {
      statusCode = 500; // Don't expose auth issues to client
      userMessage = `${apiName} authentication failed`;
      errorCode = `${apiName.toUpperCase()}_AUTH_ERROR`;
    } else if (response.status === 403) {
      statusCode = 403;
      userMessage = `Access denied by ${apiName}`;
    } else if (response.status === 404) {
      statusCode = 404;
      userMessage = `Resource not found in ${apiName}`;
    } else if (response.status >= 500) {
      statusCode = 503;
      userMessage = `${apiName} service temporarily unavailable`;
      errorCode = `${apiName.toUpperCase()}_UNAVAILABLE`;
    }

    return this.createErrorResponse(
      userMessage,
      statusCode,
      { ...context, metadata: { apiStatus: response.status } },
      errorCode
    );
  }

  // Validate environment variables
  validateEnvironment(requiredVars: string[]): ValidationResult {
    for (const varName of requiredVars) {
      const value = Deno.env.get(varName);
      if (!value || value.trim() === '') {
        this.logger.error(`Missing environment variable: ${varName}`);
        return {
          isValid: false,
          error: `Missing required environment variable: ${varName}`
        };
      }
    }
    return { isValid: true };
  }

  // Validate request authorization
  validateAuth(authHeader: string | null): ValidationResult {
    if (!authHeader) {
      return {
        isValid: false,
        error: 'No authorization header provided'
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Invalid authorization header format'
      };
    }

    return { isValid: true };
  }

  // Validate JSON request body
  async validateJsonBody<T>(request: Request): Promise<{ isValid: true; data: T } | { isValid: false; error: string }> {
    try {
      const data = await request.json();
      return { isValid: true, data };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid JSON in request body'
      };
    }
  }
}