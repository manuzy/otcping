import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

interface OrderRequest {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  makerAddress: string;
  expiration?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('1INCH_API_KEY');
    
    if (!apiKey) {
      console.error('1INCH_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: '1inch API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const orderRequest: OrderRequest = await req.json();
    console.log('Creating 1inch order:', orderRequest);

    // Calculate expiration (default 24h from now)
    const expiresIn = orderRequest.expiration 
      ? BigInt(Math.floor(new Date(orderRequest.expiration).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60);

    // Create order data structure for 1inch API
    const orderData = {
      salt: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
      makerAsset: orderRequest.sellTokenAddress,
      takerAsset: orderRequest.buyTokenAddress,
      makingAmount: orderRequest.sellAmount,
      takingAmount: orderRequest.buyAmount,
      maker: orderRequest.makerAddress,
      receiver: '0x0000000000000000000000000000000000000000',
      allowedSender: '0x0000000000000000000000000000000000000000',
      offsets: '0',
      interactions: '0x',
    };

    console.log('Order data for 1inch API:', orderData);

    // Create typed data for EIP-712 signing
    const typedData = {
      domain: {
        name: '1inch Limit Order Protocol',
        version: '4',
        chainId: 1,
        verifyingContract: '0x111111125421cA6dc452d289314280a0f8842A65',
      },
      types: {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'maker', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'allowedSender', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'offsets', type: 'uint256' },
          { name: 'interactions', type: 'bytes' },
        ],
      },
      message: {
        salt: orderData.salt,
        makerAsset: orderData.makerAsset,
        takerAsset: orderData.takerAsset,
        maker: orderData.maker,
        receiver: orderData.receiver,
        allowedSender: orderData.allowedSender,
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount,
        offsets: orderData.offsets,
        interactions: orderData.interactions,
      },
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        typedData,
        orderData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-1inch-order function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});