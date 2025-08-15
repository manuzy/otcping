import { logger, LogContext } from './logger';
import { toast } from '@/hooks/use-toast';
import * as React from 'react';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError extends Error {
  type: ErrorType;
  userMessage: string;
  code?: string;
  originalError?: Error;
  context?: LogContext;
  retryable?: boolean;
}

export class ErrorHandler {
  private getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Connection problem. Please check your internet and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Please sign in to continue.';
      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.VALIDATION:
        return error.userMessage || 'Please check your input and try again.';
      case ErrorType.NOT_FOUND:
        return 'The requested item was not found.';
      case ErrorType.SERVER:
        return 'Server error. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  createError(
    type: ErrorType,
    message: string,
    userMessage?: string,
    originalError?: Error,
    context?: LogContext
  ): AppError {
    const error = new Error(message) as AppError;
    error.type = type;
    error.userMessage = userMessage || this.getUserFriendlyMessage({ type, message, userMessage: '' } as AppError);
    error.originalError = originalError;
    error.context = context;
    error.retryable = type === ErrorType.NETWORK || type === ErrorType.SERVER;
    error.name = 'AppError';
    return error;
  }

  fromSupabaseError(error: any, context?: LogContext): AppError {
    // Handle PostgreSQL parsing errors (PGRST100)
    if (error?.code === 'PGRST100' || error?.message?.includes('unexpected')) {
      return this.createError(
        ErrorType.VALIDATION,
        'Invalid query format',
        'There was an issue with the data format. Please refresh the page and try again.',
        error,
        context
      );
    }

    // Handle Supabase-specific errors
    if (error?.code === 'PGRST116') {
      return this.createError(
        ErrorType.NOT_FOUND,
        'Resource not found',
        'The requested information could not be found.',
        error,
        context
      );
    }

    if (error?.code === '23505') {
      return this.createError(
        ErrorType.VALIDATION,
        'Duplicate entry',
        'Data updated successfully (duplicate constraint handled).',
        error,
        context
      );
    }

    if (error?.code === '42P01') {
      return this.createError(
        ErrorType.SERVER,
        'Database table not found',
        'There was a database configuration issue. Please contact support.',
        error,
        context
      );
    }

    if (error?.message?.includes('JWT') || error?.message?.includes('anonymous')) {
      return this.createError(
        ErrorType.AUTHENTICATION,
        'Authentication failed',
        'Please sign in to continue.',
        error,
        context
      );
    }

    if (error?.message?.includes('RLS') || error?.message?.includes('permission')) {
      return this.createError(
        ErrorType.AUTHORIZATION,
        'Permission denied',
        'You don\'t have permission to access this resource.',
        error,
        context
      );
    }

    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return this.createError(
        ErrorType.NETWORK,
        'Network error',
        'Please check your connection and try again.',
        error,
        context
      );
    }

    return this.createError(
      ErrorType.UNKNOWN,
      error?.message || 'Unknown error occurred',
      'Something unexpected happened. Please try again or contact support if the problem persists.',
      error,
      context
    );
  }

  fromNetworkError(error: any, context?: LogContext): AppError {
    if (!navigator.onLine) {
      return this.createError(
        ErrorType.NETWORK,
        'No internet connection',
        'Please check your internet connection and try again.',
        error,
        context
      );
    }

    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('connection refused')) {
      return this.createError(
        ErrorType.NETWORK,
        'Connection refused',
        'Unable to connect to the server. Please try again later.',
        error,
        context
      );
    }

    return this.createError(
      ErrorType.NETWORK,
      'Network error',
      undefined,
      error,
      context
    );
  }

  handle(error: AppError | Error | any, showToast = true): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = this.fromSupabaseError(error);
    } else if (error?.type) {
      appError = error as AppError;
    } else {
      appError = this.fromSupabaseError(error);
    }

    // Log the error
    logger.error(appError.message, appError.context, appError.originalError);

    // Show user notification if requested
    if (showToast) {
      toast({
        title: 'Error',
        description: appError.userMessage,
        variant: 'destructive',
      });
    }

    return appError;
  }

  handleAsync<T>(
    operation: () => Promise<T>,
    context?: LogContext,
    showToast = true
  ): Promise<{ data?: T; error?: AppError }> {
    return operation()
      .then((data) => ({ data }))
      .catch((error) => ({
        error: this.handle(error, showToast)
      }));
  }

  retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000,
    context?: LogContext
  ): Promise<T> {
    const attempt = async (retriesLeft: number): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        const appError = this.handle(error, false);
        
        if (retriesLeft > 0 && appError.retryable) {
          logger.warn(`Retrying operation, ${retriesLeft} attempts left`, context, appError.originalError);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attempt(retriesLeft - 1);
        }
        
        throw appError;
      }
    };

    return attempt(maxRetries);
  }
}

// Helper functions for common error scenarios  
export const handleSupabaseError = (error: any, context?: LogContext) => 
  errorHandler.handle(errorHandler.fromSupabaseError(error, context));

export const handleNetworkError = (error: any, context?: LogContext) => 
  errorHandler.handle(errorHandler.fromNetworkError(error, context));

export const handleAsyncOperation = <T>(
  operation: () => Promise<T>,
  context?: LogContext,
  showToast = true
) => errorHandler.handleAsync(operation, context, showToast);

export const retryOperation = <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
  context?: LogContext
) => errorHandler.retry(operation, maxRetries, delay, context);

// Create and export singleton instance
export const errorHandler = new ErrorHandler();