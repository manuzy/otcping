import type { WalletClient } from 'viem';
import { Trade } from '@/types';
import { Token } from '@/hooks/useTokens';
import { parseUnits } from 'viem';
import { Sdk, Address, MakerTraits } from '@1inch/limit-order-sdk';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';

// Custom HTTP connector for the SDK
class AxiosProviderConnector {
  async get(url: string, config?: any) {
    const response = await axios.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await axios.post(url, data, config);
    return response.data;
  }
}

export class LimitOrderService {
  private readonly MAINNET_CHAIN_ID = 1;

  private async getApiKey(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('get-1inch-api-key');
    
    if (error || !data?.success) {
      throw new Error('Failed to get 1inch API key');
    }
    
    return data.apiKey;
  }

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

      // Calculate expiration
      const expiresIn = trade.expiryTimestamp 
        ? BigInt(Math.floor(new Date(trade.expiryTimestamp).getTime() / 1000))
        : BigInt(Math.floor(Date.now() / 1000)) + BigInt(24 * 60 * 60); // Default 24h

      // Get API key and initialize 1inch SDK
      const authKey = await this.getApiKey();
      const sdk = new Sdk({
        authKey,
        networkId: this.MAINNET_CHAIN_ID,
        httpConnector: new AxiosProviderConnector(),
      });

      // Configure maker traits with expiration
      const makerTraits = MakerTraits.default()
        .withExpiration(expiresIn)
        .allowPartialFills()
        .allowMultipleFills();

      console.log('Creating 1inch limit order with SDK:', {
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        buyAmount: (parseFloat(trade.size) * limitPrice).toString(),
        limitPrice: trade.limitPrice,
        maker: walletClient.account.address,
        expiration: expiresIn.toString(),
      });

      // Create the order using the SDK
      const order = await sdk.createOrder(
        {
          makerAsset: new Address(sellToken.address),
          takerAsset: new Address(buyToken.address),
          makingAmount: sellAmount,
          takingAmount: buyAmount,
          maker: new Address(walletClient.account.address),
        },
        makerTraits,
      );

      // Get typed data for signing
      const typedData = order.getTypedData(this.MAINNET_CHAIN_ID);

      console.log('Signing order with typed data:', typedData);

      // Sign the typed data with the wallet
      const signature = await walletClient.signTypedData({
        account: walletClient.account,
        domain: typedData.domain,
        types: { Order: typedData.types.Order },
        primaryType: 'Order',
        message: typedData.message,
      });

      console.log('Order signed successfully!', { signature });

      // Submit the order using the SDK
      console.log('Submitting order to 1inch...');
      const submitResult = await sdk.submitOrder(order, signature);
      
      console.log('1inch limit order submitted successfully:', {
        result: submitResult,
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        limitPrice: trade.limitPrice,
      });

      // Return a hash or identifier from the result
      return typeof submitResult === 'string' ? submitResult : JSON.stringify(submitResult);
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
}

export const limitOrderService = new LimitOrderService();