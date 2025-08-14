import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { RetryHandler } from '../_shared/retryUtils.ts';
import { PerformanceMonitor } from '../_shared/performanceMonitor.ts';
import { RateLimiter, rateLimitConfigs } from '../_shared/rateLimiter.ts';
import { tokenPriceCache, MemoryCache } from '../_shared/cacheManager.ts';

interface PriceRequest {
  tokenAddress: string;
  chainId: number;
}

// Enhanced input validation for edge functions
function validateTokenAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Token address is required');
  }
  
  // Ethereum address format validation
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(address)) {
    throw new Error('Invalid token address format');
  }
  
  return address.toLowerCase();
}

function validateChainId(chainId: number): number {
  if (!chainId || typeof chainId !== 'number' || chainId <= 0) {
    throw new Error('Invalid chain ID');
  }
  
  // Supported chain IDs
  const supportedChains = [1, 56, 137, 42161, 10, 8453];
  if (!supportedChains.includes(chainId)) {
    throw new Error('Unsupported chain ID');
  }
  
  return chainId;
}

serve(async (req) => {
  const logger = new EdgeLogger('get-token-price');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
  const retryHandler = new RetryHandler(logger);
  const performanceMonitor = new PerformanceMonitor(1000); // 1 second threshold
  const rateLimiter = new RateLimiter(rateLimitConfigs.moderate);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  // Check rate limits
  const rateLimitResult = rateLimiter.checkLimit(req);
  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded', {
      operation: 'rate_limit_check',
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime
    });
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { 
        status: 429,
        headers: { 
          ...defaultCorsHeaders, 
          ...rateLimiter.createHeaders(rateLimitResult),
          'Content-Type': 'application/json'
        }
      }
    );
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
    
    // Enhanced input validation
    let validatedTokenAddress: string;
    let validatedChainId: number;
    
    try {
      validatedTokenAddress = validateTokenAddress(tokenAddress);
      validatedChainId = validateChainId(chainId);
    } catch (validationError) {
      logger.error('Input validation failed', {}, validationError as Error);
      return errorHandler.createErrorResponse(
        validationError as Error,
        400,
        { operation: 'input_validation' }
      );
    }

    // Generate cache key
    const cacheKey = MemoryCache.generateKey('token_price', tokenAddress, chainId);
    
    // Check cache first
    const cachedPrice = tokenPriceCache.get(cacheKey);
    if (cachedPrice) {
      logger.info('Price found in cache', {
        operation: 'cache_hit',
        tokenAddress,
        chainId
      });
      performanceMonitor.logSummary(logger);
      return responseBuilder.success({
        ...cachedPrice,
        cached: true
      });
    }

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

    const platformId = chainIdToPlatform[validatedChainId];
    if (!platformId) {
      logger.error('Unsupported chain', { operation: 'chain_validation', chainId: validatedChainId });
      return errorHandler.createErrorResponse(
        new Error('Unsupported chain'), 
        400, 
        { operation: 'chain_validation', chainId: validatedChainId }
      );
    }

    logger.info('Chain validated and mapped', {
      operation: 'chain_mapping',
      chainId: validatedChainId,
      platformId,
      tokenAddress: validatedTokenAddress
    });

    // First, get token info by contract address with platform specification
    const tokenInfoUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${validatedTokenAddress}&platform=${platformId}`;
    
    logger.apiCall('get_token_info', tokenInfoUrl, { 
      operation: 'token_info_lookup',
      tokenAddress,
      platformId
    });
    
    const { result: tokenInfoResponse, duration: tokenInfoDuration } = await performanceMonitor.timeOperation(
      'coinmarketcap_token_info',
      () => retryHandler.fetchWithRetry(
        tokenInfoUrl,
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
        },
        'get_token_info_from_coinmarketcap'
      ),
      { tokenAddress, platformId }
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

    const { result: priceResponse, duration: priceDuration } = await performanceMonitor.timeOperation(
      'coinmarketcap_price_lookup',
      () => retryHandler.fetchWithRetry(
        priceUrl,
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
        },
        'get_token_price_from_coinmarketcap'
      ),
      { tokenId }
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

    // Cache the result (1 minute TTL for price data)
    const priceResult = {
      tokenAddress: validatedTokenAddress,
      chainId: validatedChainId,
      priceUSD,
      symbol: tokenData.symbol,
      name: tokenData.name,
      lastUpdated: tokenPriceData.quote.USD.last_updated,
      cached: false
    };
    
    tokenPriceCache.set(cacheKey, priceResult, 60 * 1000); // 1 minute cache

    logger.apiSuccess('get_token_price', {
      operation: 'price_retrieval_complete',
      tokenAddress: validatedTokenAddress,
      chainId: validatedChainId,
      symbol: tokenData.symbol,
      priceUSD,
      tokenInfoDuration,
      priceDuration,
      metadata: {
        cacheKey,
        cacheStats: tokenPriceCache.getStats()
      }
    });

    // Log performance summary
    performanceMonitor.logSummary(logger);

    return responseBuilder.success(priceResult);

  } catch (error) {
    logger.apiError('get_token_price', error as Error, { operation: 'price_retrieval_failed' });
    
    // Log performance summary even on error
    performanceMonitor.logSummary(logger);
    
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'get_token_price' },
      'PRICE_RETRIEVAL_FAILED'
    );
  }
});