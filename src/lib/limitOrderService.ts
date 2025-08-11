import type { WalletClient } from 'viem';
import { Trade } from '@/types';
import { Token } from '@/hooks/useTokens';
import { parseUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export class LimitOrderService {
  private readonly MAINNET_CHAIN_ID = 1;

  async createAndSubmitLimitOrder(
    trade: Trade, 
    tokens: Token[], 
    walletClient: WalletClient
  ): Promise<string> {
    if (!walletClient?.account) {
      throw new Error('Wallet not connected');
    }

    // Validate trade data
    this.validateOrderData(trade);

    // Find token addresses
    const sellToken = this.findTokenByAddress(trade.sellAsset, tokens);
    const buyToken = this.findTokenByAddress(trade.buyAsset, tokens);

    if (!sellToken || !buyToken) {
      throw new Error('Token not found in database');
    }

    try {
      // Parse amounts with proper decimals - use tokenAmount for actual token quantity
      const sellAmount = parseUnits(trade.tokenAmount || trade.size, sellToken.decimals);
      const limitPrice = parseFloat(trade.limitPrice || '0');
      const buyAmount = parseUnits((parseFloat(trade.tokenAmount || trade.size) / limitPrice).toString(), buyToken.decimals);

      logger.info('Creating 1inch limit order', {
        component: 'LimitOrderService',
        operation: 'create_order',
        metadata: {
          sellToken: sellToken.symbol,
          buyToken: buyToken.symbol,
          sellAmount: trade.tokenAmount || trade.size,
          buyAmount: (parseFloat(trade.tokenAmount || trade.size) / limitPrice).toString(),
          limitPrice: trade.limitPrice,
          maker: walletClient.account.address
        }
      });

      // Create order data via edge function
      const { data: orderResult, error: orderError } = await supabase.functions.invoke(
        'create-1inch-order',
        {
          body: {
            sellTokenAddress: sellToken.address,
            buyTokenAddress: buyToken.address,
            sellAmount: sellAmount.toString(),
            buyAmount: buyAmount.toString(),
            makerAddress: walletClient.account.address,
            expiration: trade.expiryTimestamp,
          }
        }
      );

      if (orderError || !orderResult?.success) {
        logger.error('Failed to create order', {
          component: 'LimitOrderService',
          operation: 'create_order'
        }, orderError);
        throw new Error('Failed to create order data');
      }

      const { typedData, orderHash, extension } = orderResult;

      logger.debug('Signing order with typed data', {
        component: 'LimitOrderService',
        operation: 'sign_order',
        metadata: { orderHash: orderHash }
      });

      // Sign the typed data with the wallet
      const signature = await walletClient.signTypedData({
        account: walletClient.account,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: 'Order',
        message: typedData.message,
      });

      logger.info('Order signed successfully', {
        component: 'LimitOrderService',
        operation: 'sign_order',
        metadata: { hasSignature: !!signature }
      });

      // Submit the order to 1inch API
      const { data: submitResult, error: submitError } = await supabase.functions.invoke(
        'submit-1inch-order',
        {
          body: {
            orderData: typedData.message,
            orderHash,
            signature,
            extension,
            chainId: this.MAINNET_CHAIN_ID
          }
        }
      );

      if (submitError || !submitResult?.success) {
        logger.error('Failed to submit order to 1inch', {
          component: 'LimitOrderService',
          operation: 'submit_order',
          metadata: { hasSubmitError: !!submitError, resultError: submitResult?.error }
        }, submitError);
        const errorMessage = submitResult?.error || submitError?.message || 'Failed to submit order to 1inch API';
        throw new Error(errorMessage);
      }

      const submittedOrderHash = submitResult.orderHash;
      logger.info('1inch limit order submitted successfully', {
        component: 'LimitOrderService',
        operation: 'submit_order',
        metadata: {
          orderHash: submittedOrderHash,
          sellToken: sellToken.symbol,
          buyToken: buyToken.symbol,
          sellAmount: trade.tokenAmount || trade.size,
          limitPrice: trade.limitPrice
        }
      });

      return submittedOrderHash;
    } catch (error) {
      logger.error('Failed to create 1inch limit order', {
        component: 'LimitOrderService',
        operation: 'create_order'
      }, error as Error);
      throw new Error(`Failed to create limit order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateOrderData(trade: Trade): void {
    if (!trade.sellAsset || !trade.buyAsset) {
      throw new Error('Sell and buy assets are required');
    }

    if (!trade.limitPrice || !trade.size) {
      throw new Error('Limit price and size are required');
    }

    if (trade.expiryTimestamp && new Date(trade.expiryTimestamp) <= new Date()) {
      throw new Error('Trade has already expired');
    }
  }

  private findTokenByAddress(address: string | undefined, tokens: Token[]): Token | undefined {
    if (!address) return undefined;
    return tokens.find(token => 
      token.address.toLowerCase() === address.toLowerCase() &&
      token.chain_id === this.MAINNET_CHAIN_ID
    );
  }

  // Generate 1inch app link for limit order
  generate1inchAppLink(
    sellTokenSymbol: string, 
    buyTokenSymbol: string, 
    chainId: number = 1
  ): string {
    return `https://app.1inch.io/advanced/limit?network=${chainId}&src=${sellTokenSymbol}&dst=${buyTokenSymbol}`;
  }
}

export const limitOrderService = new LimitOrderService();