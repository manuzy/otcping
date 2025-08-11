import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SumsubWebhookPayload {
  type: string;
  reviewStatus: string;
  reviewResult?: {
    reviewAnswer: string;
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
  applicantId: string;
  externalUserId: string;
  inspectionId: string;
  correlationId: string;
  levelName: string;
  sandboxMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sumsubSecretKey = Deno.env.get('SUMSUB_SECRET_KEY');

    if (!sumsubSecretKey) {
      console.error('Missing Sumsub secret key');
      return new Response('Missing configuration', { status: 500 });
    }

    // Verify webhook signature
    const signature = req.headers.get('X-Payload-Digest');
    const body = await req.text();
    
    if (signature) {
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(body + sumsubSecretKey)
      );
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== `sha256=${expectedHex}`) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const payload: SumsubWebhookPayload = JSON.parse(body);
    console.log('Received webhook:', payload);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by external user ID (wallet address or user ID)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_address')
      .or(`wallet_address.eq.${payload.externalUserId},id.eq.${payload.externalUserId}`)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for external user ID:', payload.externalUserId);
      return new Response('Profile not found', { status: 404 });
    }

    // Map Sumsub review status to our KYC level
    let kycLevel = 'Level 0';
    let verificationDate = null;

    if (payload.reviewStatus === 'completed' && payload.reviewResult?.reviewAnswer === 'GREEN') {
      kycLevel = 'Level 1'; // Basic verification
      verificationDate = new Date().toISOString();
    } else if (payload.reviewStatus === 'completed' && payload.reviewResult?.reviewAnswer === 'RED') {
      kycLevel = 'Level 0'; // Failed verification
    }

    // Update or create KYC verification record
    const { error: kycError } = await supabase
      .from('kyc_verifications')
      .upsert({
        user_id: profile.id,
        sumsub_applicant_id: payload.applicantId,
        review_status: payload.reviewStatus,
        verification_level: kycLevel,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sumsub_applicant_id'
      });

    if (kycError) {
      console.error('Error updating KYC verification:', kycError);
    }

    // Update profile with KYC information
    const updateData: any = {
      sumsub_applicant_id: payload.applicantId,
      kyc_level: kycLevel,
      updated_at: new Date().toISOString()
    };

    if (verificationDate) {
      updateData.kyc_verification_date = verificationDate;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response('Error updating profile', { status: 500 });
    }

    console.log(`Updated KYC status for user ${profile.id}: ${kycLevel}`);

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});