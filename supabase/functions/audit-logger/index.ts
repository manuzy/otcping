import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  const logger = new EdgeLogger('audit-logger');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    if (req.method !== 'POST') {
      return errorHandler.createErrorResponse(
        new Error('Method not allowed'), 
        405, 
        { operation: 'method_validation' }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized audit log request - missing auth header');
      return errorHandler.createErrorResponse(
        new Error('Authentication required'), 
        401, 
        { operation: 'auth_validation' }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT and get user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.warn('Invalid JWT token', { error: authError?.message });
      return errorHandler.createErrorResponse(
        new Error('Invalid authentication'), 
        401, 
        { operation: 'jwt_validation' }
      );
    }

    // Parse request body
    let auditEntry: AuditLogEntry;
    try {
      auditEntry = await req.json();
    } catch (error) {
      logger.error('Failed to parse request body', {}, error as Error);
      return errorHandler.createErrorResponse(
        new Error('Invalid request body'), 
        400, 
        { operation: 'request_parsing' }
      );
    }

    // Validate audit entry
    if (!auditEntry.user_id || !auditEntry.action || !auditEntry.resource_type || !auditEntry.severity) {
      return errorHandler.createErrorResponse(
        new Error('Missing required audit log fields'), 
        400, 
        { operation: 'validation' }
      );
    }

    // Insert audit log entry
    const { data, error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: auditEntry.user_id,
        action: auditEntry.action,
        resource_type: auditEntry.resource_type,
        resource_id: auditEntry.resource_id,
        ip_address: auditEntry.ip_address || req.headers.get('cf-connecting-ip') || 'unknown',
        user_agent: auditEntry.user_agent || req.headers.get('user-agent') || 'unknown',
        metadata: auditEntry.metadata || {},
        severity: auditEntry.severity,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert audit log entry', { metadata: auditEntry }, insertError);
      return errorHandler.createErrorResponse(
        insertError, 
        500, 
        { operation: 'audit_log_insert' }
      );
    }

    // Log critical events for immediate alerting
    if (auditEntry.severity === 'critical') {
      logger.error(`CRITICAL SECURITY EVENT: ${auditEntry.action}`, {
        operation: 'critical_security_event',
        metadata: auditEntry
      });
    }

    logger.info('Audit log entry created', { 
      operation: 'audit_log_created',
      metadata: { 
        action: auditEntry.action, 
        severity: auditEntry.severity,
        user_id: auditEntry.user_id 
      }
    });

    return responseBuilder.success({
      id: data.id,
      message: 'Audit log entry created successfully'
    });

  } catch (error) {
    logger.error('Error in audit-logger function', {}, error as Error);
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'audit_logger' },
      'AUDIT_LOG_FAILED'
    );
  }
});