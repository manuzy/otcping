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

    const { level = 'basic-kyc-level' } = await req.json();

    // Get user profile for external user ID
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_address, display_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const appToken = Deno.env.get('SUMSUB_APP_TOKEN');
    const secretKey = Deno.env.get('SUMSUB_SECRET_KEY');

    if (!appToken || !secretKey) {
      throw new Error('Sumsub credentials not configured');
    }

    // Generate external user ID (use wallet address or user ID)
    const externalUserId = profile.wallet_address || user.id;
    
    // Create access token payload
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const url = '/resources/accessTokens?userId=' + encodeURIComponent(externalUserId) + '&levelName=' + encodeURIComponent(level);
    
    // Create request body
    const requestBody = JSON.stringify({
      externalUserId,
      levelName: level,
      ttlInSecs: 1800, // 30 minutes
    });
    
    // Create signature for Sumsub API (timestamp + method + url + body)
    const stringToSign = timestamp + method + url + requestBody;
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

    // Call Sumsub API to generate access token
    const sumsubResponse = await fetch(`https://api.sumsub.com${url}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': signatureHex,
        'X-App-Access-Ts': timestamp.toString(),
      },
      body: requestBody,
    });

    if (!sumsubResponse.ok) {
      const errorText = await sumsubResponse.text();
      console.error('Sumsub API error:', errorText);
      throw new Error(`Sumsub API error: ${sumsubResponse.status}`);
    }

    const tokenData = await sumsubResponse.json();

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
    }

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
    console.error('Error generating KYC token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});