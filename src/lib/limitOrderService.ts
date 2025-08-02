import type { WalletClient } from 'viem';
import { Trade } from '@/types';
import { Token } from '@/hooks/useTokens';
import { parseUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';

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
      // Parse amounts with proper decimals
      const sellAmount = parseUnits(trade.size, 18); // TODO: Use actual token decimals
      const limitPrice = parseFloat(trade.limitPrice || '0');
      const buyAmount = parseUnits((parseFloat(trade.size) * limitPrice).toString(), 18);

      console.log('Creating 1inch limit order:', {
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        buyAmount: (parseFloat(trade.size) * limitPrice).toString(),
        limitPrice: trade.limitPrice,
        maker: walletClient.account.address,
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
        console.error('Failed to create order:', orderError);
        throw new Error('Failed to create order data');
      }

      const { typedData, orderData, orderHash, extension } = orderResult;

      console.log('Signing order with typed data:', typedData);

      // Sign the typed data with the wallet
      const signature = await walletClient.signTypedData({
        account: walletClient.account,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: 'Order',
        message: typedData.message,
      });

      console.log('Order signed successfully!', { signature });

      // Submit the order to 1inch API
      const { data: submitResult, error: submitError } = await supabase.functions.invoke(
        'submit-1inch-order',
        {
          body: {
            orderData,
            orderHash,
            signature,
            extension,
            chainId: this.MAINNET_CHAIN_ID
          }
        }
      );

      if (submitError || !submitResult?.success) {
        console.error('Failed to submit order to 1inch:', {
          submitError,
          submitResult
        });
        const errorMessage = submitResult?.error || submitError?.message || 'Failed to submit order to 1inch API';
        throw new Error(errorMessage);
      }

      const submittedOrderHash = submitResult.orderHash;
      console.log('1inch limit order submitted successfully:', {
        orderHash: submittedOrderHash,
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        limitPrice: trade.limitPrice,
      });

      return submittedOrderHash;
    } catch (error) {
      console.error('Failed to create 1inch limit order:', error);
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