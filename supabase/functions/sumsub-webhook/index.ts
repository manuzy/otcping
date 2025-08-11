import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sumsub-sig',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Sumsub secret key not configured');
    }

    // Verify webhook signature
    const signature = req.headers.get('X-Sumsub-Sig');
    const body = await req.text();
    
    if (signature) {
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
      
      const expectedSignature = new Uint8Array(
        signature.split('').map(char => char.charCodeAt(0))
      );
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        expectedSignature,
        messageData
      );
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const webhookData = JSON.parse(body);
    console.log('Received Sumsub webhook:', webhookData);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract relevant data from webhook
    const {
      applicantId,
      inspectionId,
      correlationId,
      externalUserId,
      type,
      reviewStatus,
      levelName,
      sandboxMode
    } = webhookData;

    if (type === 'applicantReviewed') {
      // Find user by external user ID (could be wallet address or user ID)
      let userId = externalUserId;
      
      // If external user ID is a wallet address, find the user ID
      if (externalUserId && !externalUserId.match(/^[0-9a-f-]{36}$/)) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('wallet_address', externalUserId)
          .single();
        
        if (profile) {
          userId = profile.id;
        }
      }

      if (!userId) {
        console.error('Could not find user for external ID:', externalUserId);
        return new Response('User not found', { status: 404 });
      }

      // Update KYC verification record
      const { error: updateError } = await supabaseClient
        .from('kyc_verifications')
        .update({
          review_status: reviewStatus,
          verification_level: levelName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating KYC verification:', updateError);
      }

      // Update user's KYC level based on review status
      let kycLevel: 'Level 0' | 'Level 1' | 'Level 2' = 'Level 0';
      
      if (reviewStatus === 'completed') {
        if (levelName === 'basic' || levelName === 'basic-kyc-level') {
          kycLevel = 'Level 1';
        } else if (levelName === 'enhanced' || levelName === 'enhanced-kyc-level') {
          kycLevel = 'Level 2';
        }
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          kyc_level: kycLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile KYC level:', profileError);
      }

      console.log(`Updated user ${userId} KYC status to ${reviewStatus}, level ${kycLevel}`);
    }

    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Error processing Sumsub webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});