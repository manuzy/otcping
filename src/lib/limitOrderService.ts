import type { WalletClient } from 'viem';
import { Trade } from '@/types';
import { Token } from '@/hooks/useTokens';

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
    const sellToken = this.findTokenBySymbol(trade.sellAsset, tokens);
    const buyToken = this.findTokenBySymbol(trade.buyAsset, tokens);

    if (!sellToken || !buyToken) {
      throw new Error('Token not found in database');
    }

    // For now, we'll simulate the order creation process
    // In a real implementation, you would:
    // 1. Import the actual 1inch SDK with correct types
    // 2. Initialize the SDK with the wallet client
    // 3. Create the limit order with proper parameters
    // 4. Submit it to the 1inch protocol

    const orderParams = this.mapTradeToOrderParams(trade, sellToken, buyToken);
    
    console.log('Creating 1inch limit order with params:', {
      makerAsset: sellToken.address,
      takerAsset: buyToken.address,
      makingAmount: orderParams.makerAmount,
      takingAmount: orderParams.takerAmount,
      maker: walletClient.account.address,
      expiration: orderParams.expiration,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return a mock order hash for demonstration
    // In production, this would be the actual transaction hash
    const orderHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;

    return orderHash;
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

  private findTokenBySymbol(symbol: string | undefined, tokens: Token[]): Token | undefined {
    if (!symbol) return undefined;
    return tokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase() &&
      token.chain_id === this.MAINNET_CHAIN_ID
    );
  }

  private mapTradeToOrderParams(trade: Trade, sellToken: Token, buyToken: Token) {
    // Parse amounts - converting human readable to wei/token units
    const sellAmount = this.parseTokenAmount(trade.size, 18);
    const buyAmount = this.calculateBuyAmount(sellAmount, trade.limitPrice || '0');

    // Set expiration - use trade expiry or default to 24 hours
    const expiration = trade.expiryTimestamp 
      ? Math.floor(new Date(trade.expiryTimestamp).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    return {
      makerAsset: sellToken.address,
      takerAsset: buyToken.address,
      makerAmount: sellAmount,
      takerAmount: buyAmount,
      expiration: expiration.toString(),
    };
  }

  private parseTokenAmount(amount: string, decimals: number = 18): string {
    const multiplier = BigInt(10 ** decimals);
    const parsedAmount = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals)));
    return parsedAmount.toString();
  }

  private calculateBuyAmount(sellAmount: string, limitPrice: string): string {
    const sellAmountBig = BigInt(sellAmount);
    const priceBig = BigInt(Math.floor(parseFloat(limitPrice) * (10 ** 18)));
    const buyAmount = (sellAmountBig * priceBig) / BigInt(10 ** 18);
    return buyAmount.toString();
  }
}

export const limitOrderService = new LimitOrderService();