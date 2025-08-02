import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import {randBigInt} from "https://esm.sh/@1inch/limit-order-sdk";
import {keccak256} from "https://esm.sh/viem";

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
    console.log('🚀 Creating 1inch order with NEW code:', orderRequest);

    // Calculate expiration (default 24h from now)
    const expiresIn = orderRequest.expiration 
      ? BigInt(Math.floor(new Date(orderRequest.expiration).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60);

    const baseSalt = randBigInt((1n << 96n) - 1n);
    const encodedExtension =
      '0x000000d400000072000000720000007200000072000000390000000000000000c0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968fc0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968fc0dfdb9e7a392c3dbbe7c6fbe8fbc1789c9fe05e00000000000000000000000000000000000000000090cbe4bdd538d6e9b379bff5fe72c3d67a521de500000001f43203b09498030ae3416b66dc74db31d09524fa87b1f7d18bd45f0b94f54a968f';
    const UINT_160_MAX = (1n << 160n) - 1n
    const salt =
      (baseSalt << 160n) | (BigInt(keccak256(encodedExtension)) & UINT_160_MAX);

    // Create order data structure for 1inch API
    // const orderData = {
    //   salt: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
    //   maker: orderRequest.makerAddress,
    //   receiver: '0xc0DFdB9E7a392c3dBBE7c6FBe8FBC1789C9FE05e', // Ethereum FeeTaker contract
    //   makerAsset: orderRequest.sellTokenAddress,
    //   takerAsset: orderRequest.buyTokenAddress,
    //   makingAmount: orderRequest.sellAmount,
    //   takingAmount: orderRequest.buyAmount,
    //   makerTraits: '0x',
    // };

    const orderData = {
      salt: salt.toString(),
      maker: orderRequest.makerAddress,
      receiver: '0xc0DFdB9E7a392c3dBBE7c6FBe8FBC1789C9FE05e', // FeeTaker contract
      makerAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      takerAsset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      makingAmount: '100000000000000',
      takingAmount: '385769',
      makerTraits: '0', // TODO: this.getMakerTraits(120),
    };

    console.log('Order data for 1inch API:', orderData);

    // Create typed data for EIP-712 signing
    const typedData = {
      domain: {
        name: '1inch Aggregation Router',
        version: '6',
        chainId: 1, // Ethereum mainnet
        verifyingContract: '0x111111125421cA6dc452d289314280a0f8842A65',
      },
      types: {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'makerAsset', type: 'address' },
          { name: 'takerAsset', type: 'address' },
          { name: 'makingAmount', type: 'uint256' },
          { name: 'takingAmount', type: 'uint256' },
          { name: 'makerTraits', type: 'uint256' },
        ],
      },
      message: {
        salt: orderData.salt,
        maker: orderData.maker,
        receiver: orderData.receiver,
        makerAsset: orderData.makerAsset,
        takerAsset: orderData.takerAsset,
        makingAmount: orderData.makingAmount,
        takingAmount: orderData.takingAmount,
        makerTraits: orderData.makerTraits,
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