import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderSubmissionRequest {
  orderData: {
    salt: string;
    makerAsset: string;
    takerAsset: string;
    maker: string;
    receiver: string;
    allowedSender: string;
    makingAmount: string;
    takingAmount: string;
    offsets: string;
    interactions: string;
  };
  signature: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('1INCH_API_KEY');
    if (!apiKey) {
      console.error('1INCH_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: '1inch API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { orderData, signature }: OrderSubmissionRequest = await req.json();

    console.log('Submitting order to 1inch API:', {
      maker: orderData.maker,
      makerAsset: orderData.makerAsset,
      takerAsset: orderData.takerAsset,
      makingAmount: orderData.makingAmount,
      takingAmount: orderData.takingAmount
    });

    // Prepare the limit order for 1inch API
    const limitOrder = {
      orderHash: '', // Will be calculated by 1inch
      signature,
      data: {
        makerAsset: orderData.makerAsset,
        takerAsset: orderData.takerAsset,
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount,
        maker: orderData.maker,
        receiver: orderData.receiver,
        allowedSender: orderData.allowedSender,
        salt: orderData.salt,
        offsets: orderData.offsets,
        interactions: orderData.interactions
      }
    };

    // Submit to 1inch Limit Order API
    const response = await fetch('https://api.1inch.dev/orderbook/v4.0/1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(limitOrder)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('1inch API error:', response.status, responseData);
      throw new Error(`1inch API error: ${responseData.description || responseData.error || 'Unknown error'}`);
    }

    console.log('Order submitted successfully to 1inch:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        orderHash: responseData.orderHash || responseData.hash,
        data: responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in submit-1inch-order function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});