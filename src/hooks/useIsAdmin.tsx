import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useWalletAuth } from './useWalletAuth';
import { supabase } from '@/integrations/supabase/client';

export function useIsAdmin() {
  const { user } = useAuth();
  const { address } = useWalletAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function checkAdminRole() {
      if (!user?.id) {
        console.log('useIsAdmin: No user ID, setting admin false');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('useIsAdmin: Checking admin role for user:', user.id);
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          console.log('useIsAdmin: Admin check result:', data);
          setIsAdmin(data || false);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminRole();
  }, [user?.id]);
  
  return {
    isAdmin,
    loading,
    adminUserId: user?.id,
    isAdminWallet: false // Removed hardcoded wallet check for security
  };
}