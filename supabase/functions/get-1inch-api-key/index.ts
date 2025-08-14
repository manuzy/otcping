import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (userLimit.count >= maxRequests) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

serve(async (req) => {
  const logger = new EdgeLogger('get-1inch-api-key');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['1INCH_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized API key request - missing auth header');
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

    // Rate limiting by user ID
    if (isRateLimited(user.id, 20, 300000)) { // 20 requests per 5 minutes
      logger.warn('Rate limit exceeded for API key request', { userId: user.id });
      return errorHandler.createErrorResponse(
        new Error('Rate limit exceeded'), 
        429, 
        { operation: 'rate_limit' }
      );
    }

    const apiKey = Deno.env.get('1INCH_API_KEY')!;

    logger.info('Providing 1inch API key for authenticated user', { 
      operation: 'api_key_provision',
      userId: user.id
    });

    return responseBuilder.success({
      apiKey: apiKey 
    });

  } catch (error) {
    logger.error('Error in get-1inch-api-key function', {}, error as Error);
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'get_api_key' },
      'API_KEY_RETRIEVAL_FAILED'
    );
  }
});