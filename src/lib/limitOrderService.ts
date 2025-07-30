import type { WalletClient } from 'viem';
import { Trade } from '@/types';
import { Token } from '@/hooks/useTokens';
import { parseUnits, keccak256, toHex } from 'viem';

export class LimitOrderService {
  private readonly MAINNET_CHAIN_ID = 1;
  private readonly LIMIT_ORDER_CONTRACT = '0x1111111254eeb25477b68fb85ed929f73a960582'; // 1inch v5 contract

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
      // Parse amounts with proper decimals (using token decimals)
      const sellAmount = parseUnits(trade.size, 18); // TODO: Use actual token decimals
      const limitPrice = parseFloat(trade.limitPrice || '0');
      const buyAmount = parseUnits((parseFloat(trade.size) * limitPrice).toString(), 18);

      // Create the typed data for EIP-712 signing
      const domain = {
        name: '1inch Limit Order Protocol',
        version: '4',
        chainId: this.MAINNET_CHAIN_ID,
        verifyingContract: this.LIMIT_ORDER_CONTRACT as `0x${string}`,
      };

      const types = {
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
      };

      // Generate a random salt
      const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

      const orderData = {
        salt,
        makerAsset: sellToken.address as `0x${string}`,
        takerAsset: buyToken.address as `0x${string}`,
        maker: walletClient.account.address,
        receiver: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        allowedSender: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        makingAmount: sellAmount,
        takingAmount: buyAmount,
        offsets: BigInt(0),
        interactions: '0x' as `0x${string}`,
      };

      console.log('Creating 1inch limit order with params:', {
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        buyAmount: (parseFloat(trade.size) * limitPrice).toString(),
        limitPrice: trade.limitPrice,
        maker: walletClient.account.address,
      });

      // Sign the typed data with the wallet - this will prompt user to sign!
      const signature = await walletClient.signTypedData({
        account: walletClient.account,
        domain,
        types,
        primaryType: 'Order',
        message: orderData,
      });

      console.log('Order signed successfully!', { signature });

      // TODO: Submit to 1inch API for actual order placement
      // For now, we'll return a mock order hash
      const orderHash = keccak256(toHex(JSON.stringify(orderData)));

      console.log('1inch limit order created and signed:', {
        orderHash,
        signature,
        sellToken: sellToken.symbol,
        buyToken: buyToken.symbol,
        sellAmount: trade.size,
        limitPrice: trade.limitPrice,
      });

      return orderHash;
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