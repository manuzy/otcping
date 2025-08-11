import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { RetryHandler } from '../_shared/retryUtils.ts';

const logger = new EdgeLogger('generate-kyc-token');
const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
const retryHandler = new RetryHandler(logger);

interface KycTokenRequest {
  level?: string;
}

interface SumsubTokenResponse {
  token: string;
  userId: string;
}

// Valid KYC levels based on Sumsub dashboard configuration
const VALID_KYC_LEVELS = [
  'id-and-liveness',
  'basic-kyc-level',
  'enhanced-kyc-level', 
  'level-1',
  'level-2',
  'basic',
  'enhanced'
] as const;

const DEFAULT_TTL_SECONDS = 1800; // 30 minutes

// Validate KYC level parameter
function validateKycLevel(level: string): { isValid: boolean; error?: string } {
  if (!level || typeof level !== 'string') {
    return { isValid: false, error: 'KYC level must be a non-empty string' };
  }
  
  const trimmedLevel = level.trim();
  if (trimmedLevel.length === 0) {
    return { isValid: false, error: 'KYC level cannot be empty' };
  }
  
  // Log warning for non-standard levels but allow them
  if (!VALID_KYC_LEVELS.includes(trimmedLevel as any)) {
    logger.warn('Using non-standard KYC level', { metadata: { level: trimmedLevel } });
  }
  
  return { isValid: true };
}

// Build Sumsub API URL with query parameters
function buildSumsubUrl(externalUserId: string, level: string, ttlInSecs: number): string {
  return `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(level)}&ttlInSecs=${ttlInSecs}`;
}

// Generate HMAC signature for Sumsub API authentication
async function generateHmacSignature(
  timestamp: number,
  method: string,
  url: string,
  secretKey: string
): Promise<string> {
  const stringToSign = timestamp + method + url;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(stringToSign);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Call Sumsub API to generate access token
async function callSumsubApi(
  url: string,
  headers: Record<string, string>
): Promise<SumsubTokenResponse> {
  const fullUrl = `https://api.sumsub.com${url}`;
  
  logger.apiCall('sumsub_token_generation', fullUrl);
  
  const response = await retryHandler.fetchWithRetry(
    fullUrl,
    {
      method: 'POST',
      headers,
    },
    'Sumsub API call'
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.apiError('sumsub_token_generation', new Error(`API returned ${response.status}`), {
      metadata: { status: response.status, response: errorText }
    });
    
    // Return user-friendly error based on status
    if (response.status === 400) {
      throw new Error('Invalid request parameters for KYC verification');
    } else if (response.status === 401) {
      throw new Error('Authentication failed with KYC provider');
    } else if (response.status === 403) {
      throw new Error('Access denied by KYC provider');
    } else if (response.status === 404) {
      throw new Error('KYC verification level not found');
    } else if (response.status >= 500) {
      throw new Error('KYC provider service temporarily unavailable');
    } else {
      throw new Error(`KYC provider error: ${response.status}`);
    }
  }

  const tokenData: SumsubTokenResponse = await response.json();
  logger.apiSuccess('sumsub_token_generation', {
    metadata: { userId: tokenData.userId }
  });
  
  return tokenData;
}

// Update or create KYC verification record
async function updateKycRecord(
  supabaseClient: any,
  userId: string,
  applicantId: string,
  level: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('kyc_verifications')
    .upsert({
      user_id: userId,
      sumsub_applicant_id: applicantId,
      verification_level: level,
      review_status: 'init',
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    logger.error('Failed to update KYC verification record', { userId }, error);
    // Don't fail the entire request for database errors
  } else {
    logger.info('KYC verification record updated', { 
      userId,
      metadata: { applicantId, level }
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  logger.info('KYC token generation request started');

  try {
    // Validate environment variables
    const envValidation = errorHandler.validateEnvironment([
      'SUPABASE_URL', 
      'SUPABASE_ANON_KEY', 
      'SUMSUB_APP_TOKEN', 
      'SUMSUB_SECRET_KEY'
    ]);
    if (!envValidation.isValid) {
      return errorHandler.createErrorResponse(
        envValidation.error!,
        500,
        { operation: 'environment_validation' },
        'ENV_CONFIG_ERROR'
      );
    }

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    const authValidation = errorHandler.validateAuth(authHeader);
    if (!authValidation.isValid) {
      return errorHandler.createErrorResponse(
        authValidation.error!,
        401,
        { operation: 'auth_validation' },
        'AUTH_ERROR'
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logger.authEvent('authentication_failed', { metadata: { error: userError?.message } });
      return errorHandler.createErrorResponse(
        'Unauthorized - invalid token',
        401,
        { operation: 'user_authentication' },
        'INVALID_TOKEN'
      );
    }

    logger.authEvent('user_authenticated', { userId: user.id });

    // Parse and validate request body
    const bodyValidation = await errorHandler.validateJsonBody<KycTokenRequest>(req);
    if (!bodyValidation.isValid) {
      return errorHandler.createErrorResponse(
        bodyValidation.error,
        400,
        { operation: 'body_validation' },
        'INVALID_JSON'
      );
    }

    const { level = 'id-and-liveness' } = bodyValidation.data;
    
    // Validate KYC level
    const levelValidation = validateKycLevel(level);
    if (!levelValidation.isValid) {
      return errorHandler.createErrorResponse(
        levelValidation.error!,
        400,
        { operation: 'level_validation' },
        'INVALID_LEVEL'
      );
    }

    logger.userAction('kyc_token_request', {
      userId: user.id,
      metadata: { level }
    });

    // Get user profile for external user ID
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return errorHandler.handleSupabaseError(
        profileError,
        'profile_fetch',
        { userId: user.id }
      );
    }

    if (!profile) {
      return errorHandler.createErrorResponse(
        'User profile not found. Please complete your profile setup.',
        404,
        { userId: user.id, operation: 'profile_check' },
        'PROFILE_NOT_FOUND'
      );
    }

    // Prepare Sumsub API request
    const appToken = Deno.env.get('SUMSUB_APP_TOKEN')!;
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY')!;
    const externalUserId = profile.wallet_address || user.id;
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const ttlInSecs = DEFAULT_TTL_SECONDS;
    
    // Build URL and generate signature
    const url = buildSumsubUrl(externalUserId, level, ttlInSecs);
    const signatureHex = await generateHmacSignature(timestamp, method, url, secretKey);
    
    logger.info('Sumsub API request prepared', {
      userId: user.id,
      metadata: {
        externalUserId,
        level,
        timestamp,
        urlPath: url
      }
    });
    
    // Prepare headers for Sumsub API call
    const headers = {
      'Accept': 'application/json',
      'X-App-Token': appToken,
      'X-App-Access-Sig': signatureHex,
      'X-App-Access-Ts': timestamp.toString(),
    };
    
    // Call Sumsub API
    const tokenData = await callSumsubApi(url, headers);

    // Update KYC verification record
    await updateKycRecord(supabaseClient, user.id, tokenData.userId, level);

    logger.performance('kyc_token_generation', Date.now() - responseBuilder.startTime, {
      userId: user.id,
      metadata: { level, applicantId: tokenData.userId }
    });

    return responseBuilder.success({
      token: tokenData.token,
      userId: tokenData.userId,
      level: level,
    });

  } catch (error) {
    return errorHandler.createErrorResponse(
      error.message || 'Unknown error occurred',
      500,
      { operation: 'token_generation' },
      'GENERATION_ERROR'
    );
  }
});