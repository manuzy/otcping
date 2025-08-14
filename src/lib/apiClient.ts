import { supabase } from '@/integrations/supabase/client';
import { logger, LogContext } from './logger';
import { notifications } from './notifications';
import { errorHandler, AppError, ErrorType } from './errorHandler';

export interface ApiOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  retries?: number;
  timeout?: number;
  context?: LogContext;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: AppError;
  success: boolean;
}

class ApiClient {
  private defaultOptions: ApiOptions = {
    showErrorToast: true,
    showSuccessToast: false,
    retries: 1,
    timeout: 30000
  };

  private async withRetry<T>(
    operation: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const result = await errorHandler.retry(
        operation,
        finalOptions.retries,
        1000,
        finalOptions.context
      );

      const duration = Date.now() - startTime;
      logger.performance('API Operation', duration, finalOptions.context);

      if (finalOptions.showSuccessToast) {
        notifications.success({ description: 'Operation completed successfully!' });
      }

      return { data: result, success: true };
    } catch (error) {
      const appError = errorHandler.handle(error, finalOptions.showErrorToast);
      return { error: appError, success: false };
    }
  }

  // Database operations
  async select<T = any>(
    table: string,
    query?: string,
    options?: ApiOptions
  ): Promise<ApiResponse<T[]>> {
    const context = { operation: 'select', metadata: { table, query } };
    logger.apiCall('SELECT', table, context);

    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select(query || '*');

      if (error) throw error;
      
      logger.apiSuccess('SELECT', context);
      return data as T[];
    }, { ...options, context });
  }

  async selectSingle<T = any>(
    table: string,
    id?: string,
    options?: ApiOptions
  ): Promise<ApiResponse<T | null>> {
    const context = { operation: 'selectSingle', metadata: { table, id } };
    logger.apiCall('SELECT SINGLE', table, context);

    return this.withRetry(async () => {
      let query = supabase.from(table as any).select('*');
      
      if (id) {
        query = query.eq('id', id);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      logger.apiSuccess('SELECT SINGLE', context);
      return data as T | null;
    }, { ...options, context });
  }

  async insert<T = any>(
    table: string,
    data: Partial<T>,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    const context = { operation: 'insert', metadata: { table } };
    logger.apiCall('INSERT', table, context);

    return this.withRetry(async () => {
      const { data: result, error } = await supabase
        .from(table as any)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      logger.apiSuccess('INSERT', context);
      return result as T;
    }, { ...options, context });
  }

  async update<T = any>(
    table: string,
    id: string,
    data: Partial<T>,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    const context = { operation: 'update', metadata: { table, id } };
    logger.apiCall('UPDATE', table, context);

    return this.withRetry(async () => {
      const { data: result, error } = await supabase
        .from(table as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.apiSuccess('UPDATE', context);
      return result as T;
    }, { ...options, context });
  }

  async delete(
    table: string,
    id: string,
    options?: ApiOptions
  ): Promise<ApiResponse<void>> {
    const context = { operation: 'delete', metadata: { table, id } };
    logger.apiCall('DELETE', table, context);

    return this.withRetry(async () => {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.apiSuccess('DELETE', context);
    }, { ...options, context });
  }

  // Edge function operations
  async invokeFunction<T = any>(
    functionName: string,
    payload?: any,
    options?: ApiOptions
  ): Promise<ApiResponse<T>> {
    const context = { operation: 'invokeFunction', metadata: { functionName } };
    logger.apiCall('FUNCTION', functionName, context);

    return this.withRetry(async () => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      // Handle edge function response structure
      // Edge functions return structured responses with { success, data, timestamp, etc. }
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        if (data.success) {
          logger.apiSuccess('FUNCTION', context);
          return data.data;
        } else {
          const errorMessage = data.error || 'Edge function returned success: false';
          logger.error('Edge function failed', context, errorMessage);
          throw new Error(errorMessage);
        }
      }

      // Fallback for edge functions that return data directly
      logger.apiSuccess('FUNCTION', context);
      return data;
    }, { ...options, context });
  }

  // Authentication operations
  async signInWithPassword(
    email: string,
    password: string,
    options?: ApiOptions
  ): Promise<ApiResponse<any>> {
    const context = { operation: 'signIn', metadata: { email } };
    logger.authEvent('SIGN_IN_ATTEMPT', context);

    return this.withRetry(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      logger.authEvent('SIGN_IN_SUCCESS', context);
      return data;
    }, { ...options, context });
  }

  async signOut(options?: ApiOptions): Promise<ApiResponse<void>> {
    const context = { operation: 'signOut' };
    logger.authEvent('SIGN_OUT_ATTEMPT', context);

    return this.withRetry(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      logger.authEvent('SIGN_OUT_SUCCESS', context);
    }, { ...options, context });
  }

  // Storage operations
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: ApiOptions
  ): Promise<ApiResponse<{ path: string }>> {
    const context = { operation: 'upload', metadata: { bucket, path, fileSize: file.size } };
    logger.apiCall('UPLOAD', path, context);

    return this.withRetry(async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      logger.apiSuccess('UPLOAD', context);
      return data;
    }, { ...options, context });
  }

  async deleteFile(
    bucket: string,
    path: string,
    options?: ApiOptions
  ): Promise<ApiResponse<void>> {
    const context = { operation: 'deleteFile', metadata: { bucket, path } };
    logger.apiCall('DELETE_FILE', path, context);

    return this.withRetry(async () => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      logger.apiSuccess('DELETE_FILE', context);
    }, { ...options, context });
  }

  // Realtime operations
  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    options?: ApiOptions
  ) {
    const context = { operation: 'subscribe', metadata: { table } };
    logger.apiCall('SUBSCRIBE', table, context);

    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table },
        (payload) => {
          logger.info('Realtime update', { ...context, metadata: { ...context.metadata, event: payload.eventType } });
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }
}

export const apiClient = new ApiClient();