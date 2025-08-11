import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface KycStatus {
  status: string;
  level: string;
  applicantId?: string;
  lastChecked?: string;
}

export function useKycVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const generateKycToken = useCallback(async (level: string = 'id-and-liveness') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to start KYC verification",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-kyc-token', {
        body: { level }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error generating KYC token:', error);
      toast({
        title: "Failed to start verification",
        description: "Could not initialize KYC verification. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const checkKycStatus = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-kyc-status');

      if (error) {
        throw error;
      }

      setKycStatus(data);
      return data;
    } catch (error) {
      console.error('Error checking KYC status:', error);
      toast({
        title: "Failed to check status",
        description: "Could not retrieve KYC verification status.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const getKycBadgeText = useCallback((status: string, level?: string) => {
    switch (status) {
      case 'completed':
        return level === 'id-and-liveness' ? 'ID & Liveness Verified' : 'Verified';
      case 'pending':
        return 'Verification Pending';
      case 'reviewing':
        return 'Under Review';
      case 'rejected':
        return 'Verification Failed';
      case 'not_started':
        return 'Not Verified';
      default:
        return 'Verification Started';
    }
  }, []);

  const getKycBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'pending':
      case 'reviewing':
        return 'secondary' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  }, []);

  return {
    generateKycToken,
    checkKycStatus,
    kycStatus,
    isLoading,
    getKycBadgeText,
    getKycBadgeVariant,
  };
}