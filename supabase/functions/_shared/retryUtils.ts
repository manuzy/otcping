// Shared retry utilities for Supabase Edge Functions

import { EdgeLogger } from './logger.ts';

export interface RetryConfig {
  maxRetries: number;
  delays: number[]; // Progressive delays in ms
  timeout: number; // Request timeout in ms
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  delays: [1000, 2000, 4000], // 1s, 2s, 4s
  timeout: 30000 // 30 seconds
};

export class RetryHandler {
  private logger: EdgeLogger;
  private config: RetryConfig;

  constructor(logger: EdgeLogger, config: RetryConfig = defaultRetryConfig) {
    this.logger = logger;
    this.config = config;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    attempt: number = 0
  ): Promise<T> {
    try {
      // Add timeout to the operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
          });
        })
      ]);
      
      clearTimeout(timeoutId);
      
      if (attempt > 0) {
        this.logger.info(`${operationName} succeeded after ${attempt + 1} attempts`);
      }
      
      return result;
    } catch (error) {
      if (attempt < this.config.maxRetries - 1) {
        const delay = this.config.delays[attempt] || this.config.delays[this.config.delays.length - 1];
        
        this.logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.config.maxRetries})`,
          { metadata: { delay, error: error.message } },
          error
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation, operationName, attempt + 1);
      }
      
      this.logger.error(
        `${operationName} failed after ${this.config.maxRetries} attempts`,
        { metadata: { totalAttempts: this.config.maxRetries } },
        error
      );
      
      throw error;
    }
  }

  async fetchWithRetry(
    url: string,
    options: RequestInit,
    operationName: string = 'API call'
  ): Promise<Response> {
    return this.withRetry(
      () => fetch(url, options),
      operationName
    );
  }
}