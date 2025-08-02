import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWalletAuth } from './useWalletAuth';
import { User } from '@/types';

export type SortOption = 'reputation' | 'trades' | 'success' | 'newest';

export function usePublicUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const [kycFilter, setKycFilter] = useState<'all' | 'Level 0' | 'Level 1' | 'Level 2'>('all');
  const [traderTypeFilter, setTraderTypeFilter] = useState<'all' | 'Degen' | 'Institutional'>('all');
  const [kybFilter, setKybFilter] = useState<'all' | 'verified' | 'not_verified' | 'pending'>('all');
  const [licenseFilter, setLicenseFilter] = useState<string[]>([]);
  const { user } = useWalletAuth();

  // Fetch public users
  const fetchPublicUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true);

      // Exclude current user
      if (user?.id) {
        query = query.neq('id', user.id);
      }

      // Add search filter
      if (searchQuery.trim()) {
        query = query.or(`display_name.ilike.%${searchQuery}%,wallet_address.ilike.%${searchQuery}%`);
      }

      // Apply KYC filter
      if (kycFilter !== 'all') {
        query = query.eq('kyc_level', kycFilter);
      }

      // Apply trader type filter
      if (traderTypeFilter !== 'all') {
        query = query.eq('trader_type', traderTypeFilter);
      }

      // Apply KYB filter
      if (kybFilter !== 'all') {
        query = query.eq('kyb_status', kybFilter);
      }

      // Apply license filter
      if (licenseFilter.length > 0) {
        query = query.overlaps('licenses', licenseFilter);
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

      const formattedUsers: User[] = sortedData.map(profile => ({
        id: profile.id,
        walletAddress: profile.wallet_address || '',
        displayName: profile.display_name,
        avatar: profile.avatar || '',
        isOnline: false, // Will be updated with real-time data
        description: profile.description || '',
        isPublic: profile.is_public,
        reputation: profile.reputation,
        successfulTrades: profile.successful_trades,
        totalTrades: profile.total_trades,
        joinedAt: new Date(profile.created_at),
        contacts: [], // Will be populated by contact checking
        kycLevel: profile.kyc_level as 'Level 0' | 'Level 1' | 'Level 2',
        traderType: profile.trader_type as 'Degen' | 'Institutional',
        licenses: profile.licenses || [],
        kybStatus: profile.kyb_status as 'verified' | 'not_verified' | 'pending',
        kybProvider: profile.kyb_provider || undefined,
        kybVerifiedAt: profile.kyb_verified_at ? new Date(profile.kyb_verified_at) : undefined,
        kybVerificationType: profile.kyb_verification_type as 'basic' | 'full' | undefined,
      }));

      setUsers(formattedUsers);
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
  }, [user?.id, searchQuery, sortBy, kycFilter, traderTypeFilter, kybFilter, licenseFilter]);

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
    kycFilter,
    setKycFilter,
    traderTypeFilter,
    setTraderTypeFilter,
    kybFilter,
    setKybFilter,
    licenseFilter,
    setLicenseFilter,
    checkIsContact,
    refetch: fetchPublicUsers
  };
}