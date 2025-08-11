import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

const logger = new EdgeLogger('sumsub-webhook');
const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

interface SumsubWebhookData {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  externalUserId: string;
  type: string;
  reviewStatus: string;
  levelName: string;
  sandboxMode?: boolean;
}

// Verify webhook signature
async function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secretKey: string
): Promise<boolean> {
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert hex signature to Uint8Array
    const expectedSignature = new Uint8Array(
      signature.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    return await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      expectedSignature,
      messageData
    );
  } catch (error) {
    logger.error('Signature verification failed', { metadata: { error: error.message } }, error);
    return false;
  }
}

// Find user ID from external user ID
async function findUserId(
  supabaseClient: any,
  externalUserId: string
): Promise<string | null> {
  // If external user ID is already a UUID, use it directly
  if (externalUserId.match(/^[0-9a-f-]{36}$/)) {
    return externalUserId;
  }

  // If external user ID is a wallet address, find the user ID
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('wallet_address', externalUserId)
    .single();
  
  return profile?.id || null;
}

// Update KYC verification record
async function updateKycVerification(
  supabaseClient: any,
  userId: string,
  reviewStatus: string,
  levelName: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('kyc_verifications')
    .update({
      review_status: reviewStatus,
      verification_level: levelName,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update KYC verification: ${error.message}`);
  }
}

// Update user's KYC level based on review status
async function updateUserKycLevel(
  supabaseClient: any,
  userId: string,
  reviewStatus: string,
  levelName: string
): Promise<void> {
  let kycLevel: 'Level 0' | 'Level 1' | 'Level 2' = 'Level 0';
  
  if (reviewStatus === 'completed') {
    if (levelName === 'id-and-liveness' || 
        levelName === 'basic' || 
        levelName === 'basic-kyc-level') {
      kycLevel = 'Level 1';
    } else if (levelName === 'enhanced' || levelName === 'enhanced-kyc-level') {
      kycLevel = 'Level 2';
    }
  }

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      kyc_level: kycLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update profile KYC level: ${error.message}`);
  }

  logger.info('Profile KYC level updated', {
    userId,
    metadata: { newLevel: kycLevel, reviewStatus, levelName }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  logger.info('Webhook request received', {
    metadata: { method: req.method, url: req.url }
  });

  try {
    // Validate environment variables
    const envValidation = errorHandler.validateEnvironment(['SUMSUB_SECRET_KEY']);
    if (!envValidation.isValid) {
      return errorHandler.createErrorResponse(
        envValidation.error!,
        500,
        { operation: 'environment_validation' },
        'ENV_CONFIG_ERROR'
      );
    }

    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY')!;

    // Get request body and signature
    const signature = req.headers.get('X-Sumsub-Sig');
    const body = await req.text();
    
    logger.info('Webhook signature verification', {
      metadata: { hasSignature: !!signature, bodyLength: body.length }
    });

    // Verify webhook signature
    if (signature) {
      const isValidSignature = await verifyWebhookSignature(signature, body, secretKey);
      if (!isValidSignature) {
        logger.warn('Invalid webhook signature detected');
        return errorHandler.createErrorResponse(
          'Invalid signature',
          401,
          { operation: 'signature_verification' },
          'INVALID_SIGNATURE'
        );
      }
      logger.info('Webhook signature verified successfully');
    }

    // Parse webhook data
    let webhookData: SumsubWebhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      return errorHandler.createErrorResponse(
        'Invalid JSON in webhook body',
        400,
        { operation: 'json_parsing' },
        'INVALID_JSON'
      );
    }

    logger.info('Webhook data parsed', {
      metadata: {
        type: webhookData.type,
        reviewStatus: webhookData.reviewStatus,
        externalUserId: webhookData.externalUserId,
        levelName: webhookData.levelName
      }
    });

    // Only process applicant review events
    if (webhookData.type !== 'applicantReviewed') {
      logger.info('Ignoring non-review webhook event', {
        metadata: { type: webhookData.type }
      });
      return responseBuilder.json({ message: 'Event ignored' });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user ID
    const userId = await findUserId(supabaseClient, webhookData.externalUserId);
    if (!userId) {
      logger.error('User not found for external ID', {
        metadata: { externalUserId: webhookData.externalUserId }
      });
      return errorHandler.createErrorResponse(
        'User not found',
        404,
        { operation: 'user_lookup', metadata: { externalUserId: webhookData.externalUserId } },
        'USER_NOT_FOUND'
      );
    }

    logger.info('User found for webhook processing', {
      userId,
      metadata: { externalUserId: webhookData.externalUserId }
    });

    // Update KYC verification record
    try {
      await updateKycVerification(
        supabaseClient,
        userId,
        webhookData.reviewStatus,
        webhookData.levelName
      );
      logger.info('KYC verification record updated', { userId });
    } catch (error) {
      logger.error('Failed to update KYC verification', { userId }, error);
      // Continue processing despite this error
    }

    // Update user's KYC level
    try {
      await updateUserKycLevel(
        supabaseClient,
        userId,
        webhookData.reviewStatus,
        webhookData.levelName
      );
    } catch (error) {
      logger.error('Failed to update user KYC level', { userId }, error);
      // Continue processing despite this error
    }

    logger.info('Webhook processing completed successfully', {
      userId,
      metadata: {
        reviewStatus: webhookData.reviewStatus,
        levelName: webhookData.levelName
      }
    });

    return responseBuilder.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    return errorHandler.createErrorResponse(
      error.message || 'Unknown error occurred',
      500,
      { operation: 'webhook_processing' },
      'PROCESSING_ERROR'
    );
  }
});