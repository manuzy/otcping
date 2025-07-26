import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ContactProfile } from './useContacts';

export type SortOption = 'reputation' | 'trades' | 'success' | 'newest';

export function usePublicUsers() {
  const [users, setUsers] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const { user } = useAuth();

  // Fetch public users
  const fetchPublicUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true);

      // Exclude current user
      if (user) {
        query = query.neq('id', user.id);
      }

      // Add search filter
      if (searchQuery.trim()) {
        query = query.ilike('display_name', `%${searchQuery.trim()}%`);
      }

      // Add sorting
      switch (sortBy) {
        case 'reputation':
          query = query.order('reputation', { ascending: false });
          break;
        case 'trades':
          query = query.order('total_trades', { ascending: false });
          break;
        case 'success':
          // Sort by success rate (successful_trades / total_trades)
          query = query.order('successful_trades', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply client-side success rate sorting if needed
      let sortedData = data || [];
      if (sortBy === 'success') {
        sortedData = sortedData.sort((a, b) => {
          const aRate = a.total_trades > 0 ? a.successful_trades / a.total_trades : 0;
          const bRate = b.total_trades > 0 ? b.successful_trades / b.total_trades : 0;
          return bRate - aRate;
        });
      }

      setUsers(sortedData);
    } catch (error) {
      console.error('Error fetching public users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if a user is in contacts
  const checkIsContact = async (userId: string) => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_id', userId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchPublicUsers();
  }, [user, searchQuery, sortBy]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    const channel = supabase
      .channel('public_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchPublicUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    users,
    loading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    checkIsContact,
    refetch: fetchPublicUsers
  };
}