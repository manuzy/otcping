import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import {Sdk, MakerTraits, Address, FetchProviderConnector} from "https://esm.sh/@1inch/limit-order-sdk@5.0.3";
import { EdgeLogger } from '../_shared/logger.ts';
import { EdgeErrorHandler } from '../_shared/errorHandler.ts';
import { ResponseBuilder, defaultCorsHeaders } from '../_shared/responseUtils.ts';

interface OrderRequest {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  makerAddress: string;
  expiration?: string;
}

serve(async (req) => {
  const logger = new EdgeLogger('create-1inch-order');
  const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
  const responseBuilder = new ResponseBuilder(defaultCorsHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  try {
    logger.info('Creating 1inch order request received');

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
    const bodyValidation = await errorHandler.validateJsonBody<OrderRequest>(req);
    if (!bodyValidation.isValid) {
      logger.error('Request body validation failed', {}, new Error(bodyValidation.error));
      return errorHandler.createErrorResponse(
        new Error(bodyValidation.error), 
        400, 
        { operation: 'request_validation' }
      );
    }

    const orderRequest = bodyValidation.data;
    logger.info('Order request validated', { 
      operation: 'create_order',
      sellToken: orderRequest.sellTokenAddress,
      buyToken: orderRequest.buyTokenAddress,
      maker: orderRequest.makerAddress
    });

    // Calculate expiration (default 24h from now)
    const expiresIn = orderRequest.expiration 
      ? BigInt(Math.floor(new Date(orderRequest.expiration).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60);

    logger.info('Order parameters calculated', {
      operation: 'order_preparation',
      expiration: expiresIn.toString(),
      hasCustomExpiration: !!orderRequest.expiration
    });

    const makerTraits = MakerTraits.default()
      .withExpiration(expiresIn)
      .allowPartialFills()
      .allowMultipleFills();

    const sdk = new Sdk({
      authKey: apiKey,
      networkId: 1,
      httpConnector: new FetchProviderConnector(),
    });

    logger.apiCall('create_order', '1inch-sdk', { 
      operation: 'sdk_order_creation',
      maker: orderRequest.makerAddress
    });

    const order = await sdk.createOrder(
      {
        makerAsset: new Address(orderRequest.sellTokenAddress),
        takerAsset: new Address(orderRequest.buyTokenAddress),
        makingAmount: BigInt(orderRequest.sellAmount),
        takingAmount: BigInt(orderRequest.buyAmount),
        maker: new Address(orderRequest.makerAddress),
      },
      makerTraits,
    );

    const orderHash = order.getOrderHash(1);
    const typedData = order.getTypedData(1);
    const extension = order.extension.encode().toString();

    logger.apiSuccess('create_order', {
      operation: 'order_created',
      orderHash,
      extensionLength: extension.length
    });

    return responseBuilder.success({
      typedData,
      orderHash,
      extension,
    });

  } catch (error) {
    logger.apiError('create_order', error as Error, { operation: 'order_creation_failed' });
    return errorHandler.createErrorResponse(
      error as Error, 
      500, 
      { operation: 'create_order' },
      'ORDER_CREATION_FAILED'
    );
  }
});