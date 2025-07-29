import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chain_id: number;
}

export const useTokens = (chainId?: number) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('data_tokens')
          .select('*')
          .order('symbol');

        // Filter by chain_id if provided
        if (chainId) {
          query = query.eq('chain_id', chainId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTokens(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [chainId]);

  return { tokens, loading, error };
};