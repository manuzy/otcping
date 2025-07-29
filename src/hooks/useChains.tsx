import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Chain {
  id: string;
  name: string;
  chain_id: number;
  chain_id_hex: string;
}

export const useChains = () => {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChains = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('data_chains')
          .select('*')
          .order('name');

        if (error) throw error;
        setChains(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch chains');
      } finally {
        setLoading(false);
      }
    };

    fetchChains();
  }, []);

  return { chains, loading, error };
};