import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import {randBigInt, MakerTraits, FeeTakerExt, Address, Bps, LimitOrderWithFee} from "https://esm.sh/@1inch/limit-order-sdk";
import {keccak256, hashTypedData} from "https://esm.sh/viem";

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
    console.log('🚀 Creating 1inch order with dynamic extension:', orderRequest);

    // Get fee parameters from 1inch API
    const feeParamsUrl = `https://api.1inch.dev/orderbook/v4.0/1/fee-params?makerAsset=${orderRequest.sellTokenAddress}&takerAsset=${orderRequest.buyTokenAddress}&makerAmount=${orderRequest.sellAmount}&takerAmount=${orderRequest.buyAmount}`;
    
    const feeParamsResponse = await fetch(feeParamsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!feeParamsResponse.ok) {
      throw new Error(`Failed to get fee parameters: ${feeParamsResponse.statusText}`);
    }

    const feeParams = await feeParamsResponse.json();
    console.log('Fee parameters from 1inch API:', feeParams);

    // Create dynamic extension using 1inch SDK
    const fees = new FeeTakerExt.Fees(
      new FeeTakerExt.ResolverFee(
        new Address(feeParams.protocolFeeReceiver),
        new Bps(BigInt(feeParams.feeBps)),
        Bps.fromPercent(feeParams.whitelistDiscountPercent)
      ),
      FeeTakerExt.IntegratorFee.ZERO
    );

    const feeExt = FeeTakerExt.FeeTakerExtension.new(
      new Address(feeParams.extensionAddress),
      fees,
      Object.values(feeParams.whitelist).map((w: string) => new Address(w)),
      {
        customReceiver: orderRequest.makerAddress // Use maker as receiver
      }
    );

    // Calculate expiration (default 24h from now)
    const expiresIn = orderRequest.expiration 
      ? BigInt(Math.floor(new Date(orderRequest.expiration).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60);

    const makerTraits = MakerTraits.default()
      .withExpiration(orderRequest.expiration)
      .allowPartialFills()
      .allowMultipleFills();

    // Create order info
    const orderInfo = {
      salt: randBigInt((1n << 96n) - 1n),
      maker: orderRequest.makerAddress,
      receiver: orderRequest.makerAddress,
      makerAsset: orderRequest.sellTokenAddress,
      takerAsset: orderRequest.buyTokenAddress,
      makingAmount: orderRequest.sellAmount,
      takingAmount: orderRequest.buyAmount,
    };

    // Create limit order with fee using SDK
    const limitOrderWithFee = new LimitOrderWithFee(orderInfo, makerTraits, feeExt);

    const baseSalt = randBigInt((1n << 96n) - 1n);
    const encodedExtension = feeExt.encode();
    const UINT_160_MAX = (1n << 160n) - 1n;
    const salt = (baseSalt << 160n) | (BigInt(keccak256(encodedExtension)) & UINT_160_MAX);

    const orderData = {
      salt: salt.toString(),
      maker: orderRequest.makerAddress,
      receiver: orderRequest.makerAddress,
      makerAsset: orderRequest.sellTokenAddress,
      takerAsset: orderRequest.buyTokenAddress,
      makingAmount: orderRequest.sellAmount,
      takingAmount: orderRequest.buyAmount,
      makerTraits: makerTraits.asBigInt().toString(),
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

    const orderHash = hashTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: 'Order',
      message: typedData.message,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        typedData,
        orderData,
        orderHash
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