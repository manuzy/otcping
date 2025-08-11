import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types and interfaces
interface KycTokenRequest {
  level?: string;
}

interface SumsubTokenResponse {
  token: string;
  userId: string;
}

interface KycErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Constants
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid KYC levels based on Sumsub dashboard configuration
const VALID_KYC_LEVELS = [
  'id-and-liveness',
  // Legacy support for existing levels
  'basic-kyc-level',
  'enhanced-kyc-level', 
  'level-1',
  'level-2',
  'basic',
  'enhanced'
] as const;

const DEFAULT_TTL_SECONDS = 1800; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Progressive delays in ms
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Validates environment variables required for KYC token generation
 * @returns ValidationResult indicating if all required env vars are present
 */
function validateEnvironmentVariables(): ValidationResult {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUMSUB_APP_TOKEN', 'SUMSUB_SECRET_KEY'];
  
  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    if (!value || value.trim() === '') {
      return {
        isValid: false,
        error: `Missing required environment variable: ${varName}`
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Validates and sanitizes the KYC level parameter
 * @param level - The KYC level to validate
 * @returns ValidationResult with validated level
 */
function validateKycLevel(level: string): ValidationResult {
  if (!level || typeof level !== 'string') {
    return {
      isValid: false,
      error: 'KYC level must be a non-empty string'
    };
  }
  
  const trimmedLevel = level.trim();
  if (trimmedLevel.length === 0) {
    return {
      isValid: false,
      error: 'KYC level cannot be empty'
    };
  }
  
  // For now, allow any level but log if it's not in our known list
  if (!VALID_KYC_LEVELS.includes(trimmedLevel as any)) {
    console.warn(`Using non-standard KYC level: ${trimmedLevel}`);
  }
  
  return { isValid: true };
}

/**
 * Builds the Sumsub API URL with query parameters
 * @param externalUserId - The external user identifier
 * @param level - The KYC verification level
 * @param ttlInSecs - Token time-to-live in seconds
 * @returns The complete URL path with encoded parameters
 */
function buildSumsubUrl(externalUserId: string, level: string, ttlInSecs: number): string {
  return `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(level)}&ttlInSecs=${ttlInSecs}`;
}

/**
 * Generates HMAC signature for Sumsub API authentication
 * @param timestamp - Unix timestamp
 * @param method - HTTP method
 * @param url - URL path with query parameters
 * @param secretKey - Sumsub secret key
 * @returns Promise resolving to hex-encoded signature
 */
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

/**
 * Makes a request to Sumsub API with retry logic
 * @param url - Complete API URL
 * @param headers - Request headers
 * @param attempt - Current retry attempt (0-based)
 * @returns Promise resolving to API response
 */
async function callSumsubApiWithRetry(
  url: string,
  headers: Record<string, string>,
  attempt: number = 0
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (attempt < MAX_RETRIES - 1) {
      console.warn(`Sumsub API call failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return callSumsubApiWithRetry(url, headers, attempt + 1);
    }
    throw error;
  }
}

/**
 * Creates a standardized error response
 * @param error - Error object or message
 * @param statusCode - HTTP status code
 * @returns Response object with error details
 */
function createErrorResponse(error: any, statusCode: number = 500): Response {
  const errorResponse: KycErrorResponse = {
    error: error?.message || 'Unknown error occurred',
    code: error?.code,
    details: error?.details
  };
  
  console.error('KYC token generation error:', errorResponse);
  
  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('Starting KYC token generation request');

  try {
    // Validate environment variables
    const envValidation = validateEnvironmentVariables();
    if (!envValidation.isValid) {
      return createErrorResponse({ message: envValidation.error }, 500);
    }

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse({ message: 'No authorization header provided' }, 401);
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return createErrorResponse({ message: 'Unauthorized - invalid token' }, 401);
    }

    // Parse and validate request body
    let requestBody: KycTokenRequest;
    try {
      requestBody = await req.json();
    } catch {
      return createErrorResponse({ message: 'Invalid JSON in request body' }, 400);
    }

    // Use configured Sumsub level name - default to 'id-and-liveness'
    const { level = 'id-and-liveness' } = requestBody;
    
    // Validate KYC level
    const levelValidation = validateKycLevel(level);
    if (!levelValidation.isValid) {
      return createErrorResponse({ message: levelValidation.error }, 400);
    }

    // Get user profile for external user ID
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_address, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return createErrorResponse({ message: 'Database error retrieving profile', details: profileError.message }, 500);
    }

    if (!profile) {
      return createErrorResponse({ message: 'User profile not found. Please complete your profile setup.' }, 404);
    }

    // Get Sumsub credentials (already validated above)
    const appToken = Deno.env.get('SUMSUB_APP_TOKEN')!;
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY')!;

    // Generate external user ID (prefer wallet address over user ID)
    const externalUserId = profile.wallet_address || user.id;
    
    // Create access token request parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const ttlInSecs = DEFAULT_TTL_SECONDS;
    
    // Build URL with all required query parameters
    const url = buildSumsubUrl(externalUserId, level, ttlInSecs);
    
    // Log request details for debugging (without sensitive data)
    console.log('Generating KYC token for user:', externalUserId);
    console.log('KYC level:', level);
    console.log('URL path:', url);
    console.log('Timestamp:', timestamp);
    
    // Generate HMAC signature
    const signatureHex = await generateHmacSignature(timestamp, method, url, secretKey);
    
    // Log signature details for debugging (without exposing secrets)
    console.log('String to sign:', timestamp + method + url);
    console.log('Signature hex length:', signatureHex.length);
    
    // Prepare headers for Sumsub API call
    const headers = {
      'Accept': 'application/json',
      'X-App-Token': appToken,
      'X-App-Access-Sig': signatureHex,
      'X-App-Access-Ts': timestamp.toString(),
    };
    
    // Log the complete request being sent to Sumsub for debugging
    const fullUrl = `https://api.sumsub.com${url}`;
    console.log('Making request to Sumsub:', {
      url: fullUrl,
      method: 'POST',
      headers: {
        'Accept': headers.Accept,
        'X-App-Token': headers['X-App-Token']?.substring(0, 10) + '...',
        'X-App-Access-Ts': headers['X-App-Access-Ts'],
        'X-App-Access-Sig': headers['X-App-Access-Sig']?.substring(0, 10) + '...'
      }
    });
    
    // Call Sumsub API with retry logic
    const sumsubResponse = await callSumsubApiWithRetry(fullUrl, headers);

    if (!sumsubResponse.ok) {
      const errorText = await sumsubResponse.text();
      console.error('Sumsub API error response:', errorText);
      console.error('Request URL:', url);
      console.error('Response status:', sumsubResponse.status);
      console.error('Response headers:', Object.fromEntries(sumsubResponse.headers.entries()));
      
      // Categorize error types
      let errorMessage = `Sumsub API error: ${sumsubResponse.status}`;
      if (sumsubResponse.status === 400) {
        errorMessage = 'Invalid request parameters for KYC verification';
      } else if (sumsubResponse.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
      } else if (sumsubResponse.status === 403) {
        errorMessage = 'Access denied by KYC provider';
      } else if (sumsubResponse.status === 404) {
        errorMessage = 'KYC verification level not found';
      } else if (sumsubResponse.status >= 500) {
        errorMessage = 'KYC provider service temporarily unavailable';
      }
      
      return createErrorResponse({ 
        message: errorMessage, 
        details: errorText,
        code: `SUMSUB_${sumsubResponse.status}`
      }, sumsubResponse.status >= 500 ? 503 : 400);
    }

    const tokenData: SumsubTokenResponse = await sumsubResponse.json();

    // Update or create KYC verification record
    const { error: upsertError } = await supabaseClient
      .from('kyc_verifications')
      .upsert({
        user_id: user.id,
        sumsub_applicant_id: tokenData.userId,
        verification_level: level,
        review_status: 'init',
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error updating KYC verification:', upsertError);
      // Don't fail the entire request for database errors, but log them
    }

    // Calculate processing time for metrics
    const processingTime = Date.now() - startTime;
    console.log(`KYC token generation completed successfully in ${processingTime}ms`);
    
    // Log success metrics (without sensitive data)
    console.log('Success metrics:', {
      userId: user.id,
      level,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        token: tokenData.token,
        userId: tokenData.userId,
        level: level,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Calculate processing time for error metrics
    const processingTime = Date.now() - startTime;
    
    // Log error metrics
    console.error('Error metrics:', {
      processingTimeMs: processingTime,
      errorType: error.constructor.name,
      timestamp: new Date().toISOString()
    });
    
    return createErrorResponse(error);
  }
});