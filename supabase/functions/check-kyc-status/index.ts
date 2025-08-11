import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { RetryHandler } from '../_shared/retryUtils.ts';

const logger = new EdgeLogger('check-kyc-status');
const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
const retryHandler = new RetryHandler(logger);

interface SumsubApplicantResponse {
  review?: {
    reviewStatus: string;
  };
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

// Call Sumsub API to get applicant status
async function getSumsubApplicantStatus(
  applicantId: string,
  appToken: string,
  secretKey: string
): Promise<SumsubApplicantResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const method = 'GET';
  const url = `/resources/applicants/${applicantId}/one`;
  
  const signatureHex = await generateHmacSignature(timestamp, method, url, secretKey);
  const fullUrl = `https://api.sumsub.com${url}`;
  
  logger.apiCall('sumsub_status_check', fullUrl, { metadata: { applicantId } });
  
  const response = await retryHandler.fetchWithRetry(
    fullUrl,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': signatureHex,
        'X-App-Access-Ts': timestamp.toString(),
      },
    },
    'Sumsub status check'
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.apiError('sumsub_status_check', new Error(`API returned ${response.status}`), {
      metadata: { status: response.status, response: errorText, applicantId }
    });
    
    if (response.status === 404) {
      throw new Error('KYC application not found');
    } else if (response.status >= 500) {
      throw new Error('KYC provider service temporarily unavailable');
    } else {
      throw new Error(`KYC provider error: ${response.status}`);
    }
  }

  const applicantData: SumsubApplicantResponse = await response.json();
  logger.apiSuccess('sumsub_status_check', {
    metadata: { 
      applicantId,
      status: applicantData.review?.reviewStatus 
    }
  });
  
  return applicantData;
}

// Update KYC verification record
async function updateKycVerification(
  supabaseClient: any,
  userId: string,
  reviewStatus: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('kyc_verifications')
    .update({
      review_status: reviewStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to update KYC verification', { userId }, error);
    // Don't fail the entire request for database errors
  } else {
    logger.info('KYC verification updated', { 
      userId,
      metadata: { reviewStatus }
    });
  }
}

// Update user's KYC level if completed
async function updateUserKycLevel(
  supabaseClient: any,
  userId: string,
  reviewStatus: string,
  verificationLevel: string
): Promise<void> {
  if (reviewStatus !== 'completed') {
    return;
  }

  let kycLevel: 'Level 0' | 'Level 1' | 'Level 2' = 'Level 0';
  
  if (verificationLevel === 'id-and-liveness' || 
      verificationLevel === 'basic' || 
      verificationLevel === 'basic-kyc-level') {
    kycLevel = 'Level 1';
  } else if (verificationLevel === 'enhanced' || verificationLevel === 'enhanced-kyc-level') {
    kycLevel = 'Level 2';
  }

  const { error } = await supabaseClient
    .from('profiles')
    .update({ kyc_level: kycLevel })
    .eq('id', userId);

  if (error) {
    logger.error('Failed to update profile KYC level', { userId }, error);
    // Don't fail the entire request for database errors
  } else {
    logger.info('Profile KYC level updated', { 
      userId,
      metadata: { level: kycLevel, verificationLevel }
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  logger.info('KYC status check request started');

  try {
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
        'Unauthorized',
        401,
        { operation: 'user_authentication' },
        'INVALID_TOKEN'
      );
    }

    logger.authEvent('user_authenticated', { userId: user.id });

    // Get KYC verification record
    const { data: kycRecord, error: kycError } = await supabaseClient
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (kycError && kycError.code !== 'PGRST116') {
      return errorHandler.handleSupabaseError(
        kycError,
        'kyc_record_fetch',
        { userId: user.id }
      );
    }

    if (!kycRecord || !kycRecord.sumsub_applicant_id) {
      logger.info('KYC verification not started', { userId: user.id });
      return responseBuilder.json({ 
        status: 'not_started',
        message: 'KYC verification not started'
      });
    }

    // Validate environment variables for Sumsub API
    const envValidation = errorHandler.validateEnvironment(['SUMSUB_APP_TOKEN', 'SUMSUB_SECRET_KEY']);
    if (!envValidation.isValid) {
      return errorHandler.createErrorResponse(
        envValidation.error!,
        500,
        { operation: 'environment_validation' },
        'ENV_CONFIG_ERROR'
      );
    }

    const appToken = Deno.env.get('SUMSUB_APP_TOKEN')!;
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY')!;

    logger.userAction('kyc_status_check', {
      userId: user.id,
      metadata: { applicantId: kycRecord.sumsub_applicant_id }
    });

    // Get status from Sumsub API
    const applicantData = await getSumsubApplicantStatus(
      kycRecord.sumsub_applicant_id,
      appToken,
      secretKey
    );

    const reviewStatus = applicantData.review?.reviewStatus || 'init';

    // Update local KYC record with latest status
    await updateKycVerification(supabaseClient, user.id, reviewStatus);

    // Update profile KYC level if completed
    await updateUserKycLevel(
      supabaseClient,
      user.id,
      reviewStatus,
      kycRecord.verification_level
    );

    logger.performance('kyc_status_check', Date.now() - responseBuilder.startTime, {
      userId: user.id,
      metadata: { 
        status: reviewStatus,
        applicantId: kycRecord.sumsub_applicant_id
      }
    });

    return responseBuilder.success({
      status: reviewStatus,
      level: kycRecord.verification_level,
      applicantId: kycRecord.sumsub_applicant_id,
      lastChecked: new Date().toISOString(),
    });

  } catch (error) {
    return errorHandler.createErrorResponse(
      error.message || 'Unknown error occurred',
      500,
      { operation: 'status_check' },
      'CHECK_ERROR'
    );
  }
});