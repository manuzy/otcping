import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured logging helper
const log = (level: string, message: string, context?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    function: 'check-kyc-status',
    message,
    context
  };
  console.log(JSON.stringify(logEntry));
};

// Error response helper
const createErrorResponse = (message: string, statusCode: number = 500, context?: any) => {
  log('error', message, context);
  return new Response(
    JSON.stringify({ error: message, context }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  log('info', 'KYC status check request started');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    log('info', 'User authenticated successfully', { userId: user.id });

    // Get KYC verification record
    const { data: kycRecord, error: kycError } = await supabaseClient
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (kycError && kycError.code !== 'PGRST116') {
      return createErrorResponse('Database error retrieving KYC record', 500, { error: kycError });
    }

    if (!kycRecord || !kycRecord.sumsub_applicant_id) {
      log('info', 'KYC verification not started', { userId: user.id });
      return new Response(
        JSON.stringify({ 
          status: 'not_started',
          message: 'KYC verification not started'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const appToken = Deno.env.get('SUMSUB_APP_TOKEN');
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY');

    if (!appToken || !secretKey) {
      return createErrorResponse('Sumsub credentials not configured', 500);
    }

    log('info', 'Calling Sumsub API', { 
      userId: user.id, 
      applicantId: kycRecord.sumsub_applicant_id 
    });

    // Create signature for Sumsub API
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'GET';
    const url = `/resources/applicants/${kycRecord.sumsub_applicant_id}/one`;
    
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
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Call Sumsub API to get applicant status
    const sumsubResponse = await fetch(`https://api.sumsub.com${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': signatureHex,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });

    if (!sumsubResponse.ok) {
      const errorText = await sumsubResponse.text();
      return createErrorResponse(
        `Sumsub API error: ${sumsubResponse.status}`, 
        sumsubResponse.status >= 500 ? 503 : 400,
        { responseText: errorText }
      );
    }

    const applicantData = await sumsubResponse.json();
    log('info', 'Sumsub API response received', { 
      userId: user.id,
      status: applicantData.review?.reviewStatus 
    });

    // Update local KYC record with latest status
    const { error: updateError } = await supabaseClient
      .from('kyc_verifications')
      .update({
        review_status: applicantData.review?.reviewStatus || 'init',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      log('error', 'Error updating KYC verification', { 
        userId: user.id, 
        error: updateError 
      });
    }

    // Update profile KYC level if completed
    if (applicantData.review?.reviewStatus === 'completed') {
      let kycLevel: 'Level 0' | 'Level 1' | 'Level 2' = 'Level 0';
      
      if (kycRecord.verification_level === 'id-and-liveness' || 
          kycRecord.verification_level === 'basic' || 
          kycRecord.verification_level === 'basic-kyc-level') {
        kycLevel = 'Level 1';
      } else if (kycRecord.verification_level === 'enhanced' || kycRecord.verification_level === 'enhanced-kyc-level') {
        kycLevel = 'Level 2';
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ kyc_level: kycLevel })
        .eq('id', user.id);

      if (profileError) {
        log('error', 'Error updating profile KYC level', { 
          userId: user.id, 
          error: profileError 
        });
      } else {
        log('info', 'Profile KYC level updated', { 
          userId: user.id, 
          level: kycLevel 
        });
      }
    }

    const processingTime = Date.now() - startTime;
    log('info', 'KYC status check completed successfully', { 
      userId: user.id,
      processingTimeMs: processingTime,
      status: applicantData.review?.reviewStatus || 'init'
    });

    return new Response(
      JSON.stringify({
        status: applicantData.review?.reviewStatus || 'init',
        level: kycRecord.verification_level,
        applicantId: kycRecord.sumsub_applicant_id,
        lastChecked: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    return createErrorResponse(
      error.message || 'Unknown error occurred',
      500,
      { 
        processingTimeMs: processingTime,
        errorType: error.constructor.name 
      }
    );
  }
});