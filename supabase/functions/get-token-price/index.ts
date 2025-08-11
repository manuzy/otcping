import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { RetryHandler } from '../_shared/retryUtils.ts';

interface PriceRequest {
  tokenAddress: string;
  chainId: number;
}

serve(async (req) => {
  const logger = new EdgeLogger('get-token-price');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
  const retryHandler = new RetryHandler(logger);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('Token price request received');

    // Validate and parse request body
    const bodyValidation = await errorHandler.validateJsonBody<PriceRequest>(req);
    if (!bodyValidation.isValid) {
      logger.error('Request body validation failed', {}, new Error(bodyValidation.error));
      return errorHandler.createErrorResponse(
        new Error(bodyValidation.error), 
        400, 
        { operation: 'request_validation' }
      );
    }

    const { tokenAddress, chainId } = bodyValidation.data;

    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['COINMARKETCAP_API_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    const apiKey = Deno.env.get('COINMARKETCAP_API_KEY')!;

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
      logger.error('Unsupported chain', { operation: 'chain_validation', chainId });
      return errorHandler.createErrorResponse(
        new Error('Unsupported chain'), 
        400, 
        { operation: 'chain_validation', chainId }
      );
    }

    logger.info('Chain validated and mapped', {
      operation: 'chain_mapping',
      chainId,
      platformId,
      tokenAddress
    });

    // First, get token info by contract address with platform specification
    const tokenInfoUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&platform=${platformId}`;
    
    logger.apiCall('get_token_info', tokenInfoUrl, { 
      operation: 'token_info_lookup',
      tokenAddress,
      platformId
    });
    
    const tokenInfoResponse = await retryHandler.fetchWithRetry(
      tokenInfoUrl,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json',
        },
      },
      'get_token_info_from_coinmarketcap'
    );

    if (!tokenInfoResponse.ok) {
      const errorText = await tokenInfoResponse.text();
      logger.error('CoinMarketCap token info API error', {
        operation: 'api_error',
        status: tokenInfoResponse.status,
        tokenAddress,
        platformId,
        errorText
      }, new Error(errorText));
      return errorHandler.handleExternalApiError(tokenInfoResponse, 'CoinMarketCap Token Info', {
        operation: 'token_info_lookup',
        tokenAddress,
        platformId
      });
    }

    const tokenInfoData = await tokenInfoResponse.json();
    logger.info('Token info retrieved successfully', {
      operation: 'token_info_success',
      tokenAddress,
      platformId,
      hasData: !!tokenInfoData.data
    });

    // Extract token ID from response
    const tokenData = Object.values(tokenInfoData.data)[0] as any;
    if (!tokenData || !tokenData.id) {
      logger.error('Token not found in CoinMarketCap', {
        operation: 'token_not_found',
        tokenAddress,
        platformId
      });
      return errorHandler.createErrorResponse(
        new Error('Token not found'), 
        404, 
        { operation: 'token_lookup', tokenAddress, platformId }
      );
    }

    const tokenId = tokenData.id;
    logger.info('Token ID retrieved', {
      operation: 'token_id_lookup',
      tokenId,
      symbol: tokenData.symbol,
      name: tokenData.name
    });

    // Now get the current price
    const priceUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${tokenId}&convert=USD`;
    
    logger.apiCall('get_token_price', priceUrl, {
      operation: 'price_lookup',
      tokenId
    });

    const priceResponse = await retryHandler.fetchWithRetry(
      priceUrl,
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json',
        },
      },
      'get_token_price_from_coinmarketcap'
    );

    if (!priceResponse.ok) {
      const errorText = await priceResponse.text();
      logger.error('CoinMarketCap price API error', {
        operation: 'price_api_error',
        status: priceResponse.status,
        tokenId,
        errorText
      }, new Error(errorText));
      return errorHandler.handleExternalApiError(priceResponse, 'CoinMarketCap Price', {
        operation: 'price_lookup',
        tokenId
      });
    }

    const priceData = await priceResponse.json();
    logger.info('Price data retrieved successfully', {
      operation: 'price_success',
      tokenId,
      hasData: !!priceData.data
    });

    const tokenPriceData = priceData.data[tokenId];
    if (!tokenPriceData || !tokenPriceData.quote || !tokenPriceData.quote.USD) {
      logger.error('Price data not available', {
        operation: 'price_data_missing',
        tokenId
      });
      return errorHandler.createErrorResponse(
        new Error('Price data not available'), 
        404, 
        { operation: 'price_data_extraction', tokenId }
      );
    }

    const priceUSD = tokenPriceData.quote.USD.price;

    logger.apiSuccess('get_token_price', {
      operation: 'price_retrieval_complete',
      tokenAddress,
      chainId,
      symbol: tokenData.symbol,
      priceUSD
    });

    return responseBuilder.success({
      tokenAddress,
      chainId,
      priceUSD,
      symbol: tokenData.symbol,
      name: tokenData.name,
      lastUpdated: tokenPriceData.quote.USD.last_updated,
    });

  } catch (error) {
    logger.apiError('get_token_price', error as Error, { operation: 'price_retrieval_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'get_token_price' },
      'PRICE_RETRIEVAL_FAILED'
    );
  }
});