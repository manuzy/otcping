import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

interface PriceRequest {
  tokenAddress: string;
  chainId: number;
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
    const { tokenAddress, chainId }: PriceRequest = await req.json();
    
    if (!tokenAddress || !chainId) {
      return new Response(
        JSON.stringify({ error: 'Token address and chain ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!apiKey) {
      console.error('CoinMarketCap API key not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map chain IDs to CoinMarketCap platform IDs
    const chainIdToPlatform: { [key: number]: string } = {
      1: 'ethereum',      // Ethereum
      56: 'binance-smart-chain', // BSC
      137: 'polygon',     // Polygon
      42161: 'arbitrum',  // Arbitrum
      10: 'optimism',     // Optimism
      8453: 'base',       // Base
    };

    const platformId = chainIdToPlatform[chainId];
    if (!platformId) {
      return new Response(
        JSON.stringify({ error: 'Unsupported chain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, get token info by contract address (let CoinMarketCap auto-detect platform)
    const tokenInfoUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}`;
    console.log(`Fetching token info for address ${tokenAddress} on chain ${chainId}`);
    
    const tokenInfoResponse = await fetch(tokenInfoUrl, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!tokenInfoResponse.ok) {
      const errorText = await tokenInfoResponse.text();
      console.error(`CoinMarketCap token info API error for ${tokenAddress}:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch token information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenInfoData = await tokenInfoResponse.json();
    console.log(`Token info response for ${tokenAddress} on ${platformId}:`, tokenInfoData);

    // Extract token ID from response
    const tokenData = Object.values(tokenInfoData.data)[0] as any;
    if (!tokenData || !tokenData.id) {
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenId = tokenData.id;

    // Now get the current price
    const priceUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${tokenId}&convert=USD`;
    const priceResponse = await fetch(priceUrl, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!priceResponse.ok) {
      console.error('CoinMarketCap price API error:', await priceResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch token price' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceData = await priceResponse.json();
    console.log('Price response:', priceData);

    const tokenPriceData = priceData.data[tokenId];
    if (!tokenPriceData || !tokenPriceData.quote || !tokenPriceData.quote.USD) {
      return new Response(
        JSON.stringify({ error: 'Price data not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceUSD = tokenPriceData.quote.USD.price;

    return new Response(
      JSON.stringify({
        tokenAddress,
        chainId,
        priceUSD,
        symbol: tokenData.symbol,
        name: tokenData.name,
        lastUpdated: tokenPriceData.quote.USD.last_updated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in get-token-price function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});