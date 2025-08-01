import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import {Address, MakerTraits, Sdk} from "@1inch/limit-order-sdk";
import {AxiosProviderConnector} from "@1inch/limit-order-sdk/axios";
import {privateKeyToAccount} from "viem/accounts";

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

  // it is a well-known test private key, do not use it in production
  const privKey =
    'df02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1';
  const authKey = 'K9nGKGwREwyBeH6NxkKeAQVRz6gCK5sg';
  // const maker = new Wallet(privKey);
  const maker = privateKeyToAccount(privKey as `0x${string}`);
  const expiresIn = 120n; // 2m
  const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;

  // see MakerTraits.ts
  const makerTraits = MakerTraits.default()
    .withExpiration(expiration)
    .allowPartialFills()
    .allowMultipleFills();

  const sdk = new Sdk({
    authKey,
    networkId: 1,
    httpConnector: new AxiosProviderConnector(),
  });

  const order = await sdk.createOrder(
    {
      makerAsset: new Address('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
      takerAsset: new Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
      makingAmount: 100000000000000n,
      takingAmount: 385769n,
      maker: new Address(maker.address),
      // salt? : bigint
      // receiver? : Address
    },
    makerTraits,
  );

  const typedData = order.getTypedData(1);

  console.log('### typedData');
  console.log(typedData);
  console.log(typedData.types);

  const signature = await maker.signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: 'Order',  // This is required in viem
    message: typedData.message,
  });


  console.log(signature);
  console.log(order.extension);
  console.log(order.extension.encode());

  try {
    console.log('### submitting');
    await sdk.submitOrder(order, signature);
    console.log('### done');
  } catch (e) {
    console.log('### error');
    console.log(e);
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