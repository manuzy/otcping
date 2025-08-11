import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';
import { RetryHandler } from '../_shared/retryUtils.ts';

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
  extension: string;
  chainId?: number;
}

serve(async (req) => {
  const logger = new EdgeLogger('submit-1inch-order');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);
  const retryHandler = new RetryHandler(logger);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('Order submission request received');

    // Validate environment
    const envValidation = errorHandler.validateEnvironment(['1INCH_API_KEY']);
    if (!envValidation.isValid) {
      logger.error('Environment validation failed', {}, new Error(envValidation.error!));
      return errorHandler.createErrorResponse(
        new Error(envValidation.error!), 
        500, 
        { operation: 'environment_validation' }
      );
    }

    const apiKey = Deno.env.get('1INCH_API_KEY')!;

    // Validate and parse request body
    const bodyValidation = await errorHandler.validateJsonBody<OrderSubmissionRequest>(req);
    if (!bodyValidation.isValid) {
      logger.error('Request body validation failed', {}, new Error(bodyValidation.error));
      return errorHandler.createErrorResponse(
        new Error(bodyValidation.error), 
        400, 
        { operation: 'request_validation' }
      );
    }

    const { orderData, orderHash, signature, extension, chainId = 1 } = bodyValidation.data;

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

    logger.info('Order data validated', {
      operation: 'order_validation',
      chainId,
      maker: orderData.maker,
      makerAsset: orderData.makerAsset,
      takerAsset: orderData.takerAsset,
      makingAmount: orderData.makingAmount,
      takingAmount: orderData.takingAmount
    });

    // Prepare the limit order for 1inch API (send order data directly, no wrapper)
    const body = {
      orderHash: orderHash,
      signature,
      data: {
        ...orderData,
        extension: extension,
      },
    };

    const apiUrl = `https://api.1inch.dev/orderbook/v4.0/${chainId}`;
    logger.apiCall('submit_order', apiUrl, {
      operation: 'order_submission',
      chainId,
      orderHash
    });

    // Submit to 1inch Limit Order API with retry logic
    const response = await retryHandler.fetchWithRetry(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      },
      'submit_order_to_1inch'
    );

    const responseData = await response.json();

    logger.info('1inch API response received', {
      operation: 'api_response',
      status: response.status,
      statusText: response.statusText,
      hasData: !!responseData
    });

    if (!response.ok) {
      const errorMessage = responseData.description || responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`;
      logger.error('1inch API error', {
        operation: 'api_error',
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        requestBody: body
      }, new Error(errorMessage));
      throw new Error(`1inch API error: ${errorMessage}`);
    }

    logger.apiSuccess('submit_order', {
      operation: 'order_submitted',
      orderHash: responseData.orderHash || responseData.hash
    });

    return responseBuilder.success({
      orderHash: responseData.orderHash || responseData.hash,
      data: responseData
    });

  } catch (error) {
    logger.apiError('submit_order', error as Error, { operation: 'order_submission_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'submit_order' },
      'ORDER_SUBMISSION_FAILED'
    );
  }
});