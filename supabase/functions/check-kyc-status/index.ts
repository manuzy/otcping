import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
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
      throw new Error('Unauthorized');
    }

    // Get KYC verification record
    const { data: kycRecord } = await supabaseClient
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!kycRecord || !kycRecord.sumsub_applicant_id) {
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
      throw new Error('Sumsub credentials not configured');
    }

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
      console.error('Sumsub API error:', errorText);
      throw new Error(`Sumsub API error: ${sumsubResponse.status}`);
    }

    const applicantData = await sumsubResponse.json();

    // Update local KYC record with latest status
    const { error: updateError } = await supabaseClient
      .from('kyc_verifications')
      .update({
        review_status: applicantData.review?.reviewStatus || 'init',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating KYC verification:', updateError);
    }

    // Update profile KYC level if completed
    if (applicantData.review?.reviewStatus === 'completed') {
      let kycLevel: 'Level 0' | 'Level 1' | 'Level 2' = 'Level 0';
      
      if (kycRecord.verification_level === 'basic-kyc-level') {
        kycLevel = 'Level 1';
      } else if (kycRecord.verification_level === 'enhanced-kyc-level') {
        kycLevel = 'Level 2';
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ kyc_level: kycLevel })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile KYC level:', profileError);
      }
    }

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
    console.error('Error checking KYC status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});