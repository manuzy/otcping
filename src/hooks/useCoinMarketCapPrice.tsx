import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TokenPrice {
  tokenAddress: string;
  chainId: number;
  priceUSD: number;
  symbol: string;
  name: string;
  lastUpdated: string;
}

interface UseCoinMarketCapPriceReturn {
  price: TokenPrice | null;
  loading: boolean;
  error: string | null;
  refreshPrice: () => void;
  convertUSDToToken: (usdAmount: string) => string;
  convertTokenToUSD: (tokenAmount: string) => string;
}

// Cache for prices to avoid excessive API calls
const priceCache = new Map<string, { price: TokenPrice; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export const useCoinMarketCapPrice = (
  tokenAddress: string,
  chainId: number
): UseCoinMarketCapPriceReturn => {
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${tokenAddress}-${chainId}`;

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress || !chainId || tokenAddress === "" || chainId === 0) {
      setPrice(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPrice(cached.price);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('get-token-price', {
        body: { tokenAddress, chainId }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Failed to fetch price');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.priceUSD) {
        throw new Error('No price data received');
      }

      const priceData: TokenPrice = {
        tokenAddress: data.tokenAddress,
        chainId: data.chainId,
        priceUSD: data.priceUSD,
        symbol: data.symbol,
        name: data.name,
        lastUpdated: data.lastUpdated,
      };

      // Cache the result
      priceCache.set(cacheKey, { price: priceData, timestamp: Date.now() });
      setPrice(priceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching token price:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, chainId, cacheKey]);

  const refreshPrice = useCallback(() => {
    // Clear cache for this token and refetch
    priceCache.delete(cacheKey);
    fetchPrice();
  }, [cacheKey, fetchPrice]);

  const convertUSDToToken = useCallback((usdAmount: string): string => {
    if (!price || !usdAmount || isNaN(Number(usdAmount))) {
      return '0';
    }
    
    const usd = parseFloat(usdAmount);
    const tokenAmount = usd / price.priceUSD;
    
    // Format to appropriate decimal places
    if (tokenAmount < 0.001) {
      return tokenAmount.toExponential(3);
    } else if (tokenAmount < 1) {
      return tokenAmount.toFixed(6);
    } else if (tokenAmount < 1000) {
      return tokenAmount.toFixed(4);
    } else {
      return tokenAmount.toFixed(2);
    }
  }, [price]);

  const convertTokenToUSD = useCallback((tokenAmount: string): string => {
    if (!price || !tokenAmount || isNaN(Number(tokenAmount))) {
      return '0';
    }
    
    const tokens = parseFloat(tokenAmount);
    const usdAmount = tokens * price.priceUSD;
    
    return usdAmount.toFixed(2);
  }, [price]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  return {
    price,
    loading,
    error,
    refreshPrice,
    convertUSDToToken,
    convertTokenToUSD,
  };
};