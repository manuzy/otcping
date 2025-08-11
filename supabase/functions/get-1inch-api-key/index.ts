import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

serve(async (req) => {
  const logger = new EdgeLogger('get-1inch-api-key');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('API key request received');

    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['1INCH_API_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    const apiKey = Deno.env.get('1INCH_API_KEY')!;

    logger.info('Providing 1inch API key for SDK', { 
      operation: 'api_key_provision',
      keyLength: apiKey.length
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