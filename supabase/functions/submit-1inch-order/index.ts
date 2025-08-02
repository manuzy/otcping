import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderSubmissionRequest {
  orderData: {
    salt: string;
    maker: string;
    receiver: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
    makerTraits: string;
  };
  orderHash: string;
  signature: string;
  chainId?: number;
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

    const { orderData, orderHash, signature, chainId = 1 }: OrderSubmissionRequest = await req.json();

    // Validate that we have proper addresses (not just "0x")
    if (!orderData.makerAsset || orderData.makerAsset === '0x' || orderData.makerAsset.length < 42) {
      throw new Error(`Invalid makerAsset address: ${orderData.makerAsset}`);
    }
    if (!orderData.takerAsset || orderData.takerAsset === '0x' || orderData.takerAsset.length < 42) {
      throw new Error(`Invalid takerAsset address: ${orderData.takerAsset}`);
    }
    if (!orderData.maker || orderData.maker === '0x' || orderData.maker.length < 42) {
      throw new Error(`Invalid maker address: ${orderData.maker}`);
    }

    console.log('Submitting order to 1inch API:', {
      chainId,
      maker: orderData.maker,
      makerAsset: orderData.makerAsset,
      takerAsset: orderData.takerAsset,
      makingAmount: orderData.makingAmount,
      takingAmount: orderData.takingAmount
    });

    const encodedExtension =
      '0x000000d400000072000000720000007200000072000000390000000000000000c0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968fc0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968fc0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000000000000000000000000000000000000000090cbe4bdd538d6e9b379bff5fe72c3d67a521de500000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968f';

    // Prepare the limit order for 1inch API (send order data directly, no wrapper)
    const body = {
      orderHash: orderHash,
      signature,
      data: {
        ...orderData,
        extension: encodedExtension,
      },
    };

    // const limitOrder = {
    //   salt: orderData.salt,
    //   makerAsset: orderData.makerAsset,
    //   takerAsset: orderData.takerAsset,
    //   makingAmount: orderData.makingAmount,
    //   takingAmount: orderData.takingAmount,
    //   maker: orderData.maker,
    //   receiver: orderData.receiver,
    //   allowedSender: orderData.allowedSender,
    //   offsets: orderData.offsets,
    //   interactions: orderData.interactions,
    //   signature
    // };

    console.log('Full request to 1inch API:', {
      url: `https://api.1inch.dev/orderbook/v4.0/${chainId}`,
      body: body
    });

    // Submit to 1inch Limit Order API with correct endpoint
    const response = await fetch(`https://api.1inch.dev/orderbook/v4.0/${chainId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseData = await response.json();

    console.log('1inch API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData
    });

    if (!response.ok) {
      console.error('1inch API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: responseData,
        requestBody: body
      });
      const errorMessage = responseData.description || responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`1inch API error: ${errorMessage}`);
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