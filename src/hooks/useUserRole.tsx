import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'moderator' | 'user' | null;

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function fetchUserRole() {
      if (!user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });
        
        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data || null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user?.id]);

  const hasRole = useCallback((requiredRole: UserRole) => {
    if (!role || !requiredRole) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'moderator': 2,
      'user': 1
    };
    
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  }, [role]);
  
  return {
    role,
    loading,
    hasRole,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isUser: role === 'user'
  };
}