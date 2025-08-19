import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BetaUser {
  id: string;
  user_id: string;
  wallet_address: string;
  display_name: string;
  email?: string;
  telegram?: string;
  referral_name?: string;
  is_active: boolean;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export function useBetaUsers() {
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching beta users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch beta users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('beta_users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, is_active: isActive } : user
        )
      );

      toast({
        title: "Success",
        description: `User ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('beta_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== userId));

      toast({
        title: "Success",
        description: "User removed from beta list",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const addBetaApplication = async (applicationData: {
    wallet_address: string;
    display_name: string;
    email?: string;
    telegram?: string;
    referral_name?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .insert({
          ...applicationData,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Beta application submitted successfully",
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error submitting beta application:', error);
      toast({
        title: "Error",
        description: "Failed to submit beta application",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    updating,
    updateUserStatus,
    deleteUser,
    addBetaApplication,
    refetch: fetchUsers
  };
}