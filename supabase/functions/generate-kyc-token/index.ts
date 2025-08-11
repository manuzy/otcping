import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from "https://deno.land/std@0.192.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SumsubTokenRequest {
  userId: string;
  levelName?: string;
  externalUserId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sumsubAppToken = Deno.env.get('SUMSUB_APP_TOKEN');
    const sumsubSecretKey = Deno.env.get('SUMSUB_SECRET_KEY');

    if (!sumsubAppToken || !sumsubSecretKey) {
      console.error('Missing Sumsub credentials');
      return new Response(
        JSON.stringify({ error: 'Sumsub credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address, sumsub_applicant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalUserId = profile.wallet_address || user.id;
    const levelName = 'basic-kyc-level';

    // Generate access token for Sumsub WebSDK
    const method = 'POST';
    const url = `/resources/accessTokens?userId=${externalUserId}&levelName=${levelName}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Create signature
    const signatureData = `${timestamp}${method}${url}`;
    const keyData = new TextEncoder().encode(sumsubSecretKey);
    const messageData = new TextEncoder().encode(signatureData);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hexSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Make request to Sumsub API
    const sumsubResponse = await fetch(`https://api.sumsub.com${url}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-App-Token': sumsubAppToken,
        'X-App-Access-Sig': hexSignature,
        'X-App-Access-Ts': timestamp.toString(),
      },
    });

    if (!sumsubResponse.ok) {
      const errorText = await sumsubResponse.text();
      console.error('Sumsub API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await sumsubResponse.json();

    return new Response(
      JSON.stringify({
        token: tokenData.token,
        userId: externalUserId,
        levelName
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating KYC token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});