import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { KycLevel } from '@/components/kyc/KycStatusBadge';
import { toast } from 'sonner';

interface KycData {
  kycLevel: KycLevel;
  verificationDate: string | null;
  sumsubApplicantId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface KycVerification {
  id: string;
  user_id: string;
  sumsub_applicant_id: string;
  review_status: string;
  verification_level: string;
  created_at: string;
  updated_at: string;
}

export function useKyc() {
  const { user } = useAuth();
  const [kycData, setKycData] = useState<KycData>({
    kycLevel: 'Level 0',
    verificationDate: null,
    sumsubApplicantId: null,
    isLoading: true,
    error: null
  });

  const fetchKycData = async () => {
    if (!user) {
      setKycData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setKycData(prev => ({ ...prev, isLoading: true, error: null }));

      // Get profile KYC data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('kyc_level, kyc_verification_date, sumsub_applicant_id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Get detailed verification data
      const { data: verification, error: verificationError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationError) {
        console.error('Error fetching verification data:', verificationError);
      }

      setKycData({
        kycLevel: (profile?.kyc_level as KycLevel) || 'Level 0',
        verificationDate: profile?.kyc_verification_date || null,
        sumsubApplicantId: profile?.sumsub_applicant_id || null,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching KYC data:', error);
      setKycData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch KYC data'
      }));
    }
  };

  const initiateKycVerification = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-kyc-token', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate KYC token');
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate KYC verification';
      console.error('KYC initiation error:', error);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const checkKycStatus = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!user || !kycData.sumsubApplicantId) {
      return { success: false, error: 'No verification in progress' };
    }

    try {
      // You could add an edge function to check status with Sumsub API
      // For now, just refresh local data
      await fetchKycData();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check KYC status';
      return { success: false, error: errorMessage };
    }
  };

  const refreshKycData = () => {
    fetchKycData();
  };

  // Set up real-time subscription for KYC updates
  useEffect(() => {
    if (!user) return;

    fetchKycData();

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel('kyc-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          fetchKycData();
        }
      )
      .subscribe();

    // Subscribe to verification changes
    const verificationSubscription = supabase
      .channel('kyc-verification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kyc_verifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('KYC verification updated:', payload);
          fetchKycData();
          
          // Show toast notification for status changes
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newStatus = payload.new.review_status;
            if (newStatus === 'completed') {
              toast.success('KYC verification completed!');
            } else if (newStatus === 'rejected') {
              toast.error('KYC verification was rejected. Please try again.');
            }
          }
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
      verificationSubscription.unsubscribe();
    };
  }, [user]);

  return {
    ...kycData,
    initiateKycVerification,
    checkKycStatus,
    refreshKycData,
    isVerified: kycData.kycLevel !== 'Level 0',
    isBasicVerified: kycData.kycLevel === 'Level 1' || kycData.kycLevel === 'Level 2',
    isFullyVerified: kycData.kycLevel === 'Level 2'
  };
}