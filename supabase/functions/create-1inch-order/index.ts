import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import {Sdk, MakerTraits, Address, FetchProviderConnector} from "https://esm.sh/@1inch/limit-order-sdk@5.0.3";


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
    console.log('🚀 Creating 1inch order with SDK:', orderRequest);

    // Calculate expiration (default 24h from now)
    const expiresIn = orderRequest.expiration 
      ? BigInt(Math.floor(new Date(orderRequest.expiration).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60);

    const makerTraits = MakerTraits.default()
      .withExpiration(expiresIn)
      .allowPartialFills()
      .allowMultipleFills();

    const sdk = new Sdk({
      authKey: apiKey,
      networkId: 1,
      httpConnector: new FetchProviderConnector(),
    });

    const order0 = await sdk.createOrder(
      {
        makerAsset: new Address('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
        takerAsset: new Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
        makingAmount: 100000000000000n,
        takingAmount: 385769n,
        maker: new Address(orderRequest.makerAddress),
        // salt? : bigint
        // receiver? : Address
      },
      makerTraits,
    );

    return new Response(
      JSON.stringify({
        success: true,
        typedData: order0.getTypedData(1),
        orderHash: order0.getOrderHash(1),
        extension: order0.extension.encode().toString(),
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