import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWalletAuth } from './useWalletAuth';

export function useBetaAccess() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isBetaActive, setIsBetaActive] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useWalletAuth();

  const checkBetaAccess = async () => {
    try {
      // First check if beta is active
      const { data: settingsData } = await supabase.rpc('get_beta_settings');
      const betaActive = (settingsData as any)?.is_beta_active || false;
      setIsBetaActive(betaActive);

      // If beta is not active, everyone has access
      if (!betaActive) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // If user is not authenticated, no access
      if (!isAuthenticated || !user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if user has beta access
      const { data: accessData, error } = await supabase.rpc('has_beta_access', {
        check_user_id: user.id
      });

      if (error) {
        console.error('Error checking beta access:', error);
        setHasAccess(false);
      } else {
        setHasAccess(accessData || false);
      }
    } catch (error) {
      console.error('Error in beta access check:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const checkUserBetaStatus = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error checking user beta status:', error);
      return null;
    }
  };

  useEffect(() => {
    checkBetaAccess();
  }, [isAuthenticated, user]);

  return {
    hasAccess,
    isBetaActive,
    loading,
    checkUserBetaStatus,
    refetch: checkBetaAccess
  };
}