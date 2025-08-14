import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { apiClient } from '@/lib/apiClient';

interface KycStatus {
  status: string;
  level: string;
  applicantId?: string;
  lastChecked?: string;
}

export function useKycVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const { user } = useAuth();

  const generateKycToken = useCallback(async (level: string = 'id-and-liveness') => {
    if (!user) {
      notifications.error({
        title: "Authentication required",
        description: "Please sign in to start KYC verification",
      });
      return null;
    }

    setIsLoading(true);
    logger.userAction('KYC Token Generation', { userId: user.id, metadata: { level } });

    try {
      const result = await apiClient.invokeFunction('generate-kyc-token', 
        { level },
        { 
          showErrorToast: true,
          context: { userId: user.id, operation: 'generateKycToken' }
        }
      );

      if (result.success && result.data) {
        logger.info('KYC token generated successfully', { 
          userId: user.id, 
          metadata: { tokenStructure: typeof result.data, hasToken: !!result.data?.token }
        });
        return result.data;
      } else {
        logger.error('KYC token generation failed', { 
          userId: user.id, 
          metadata: { result: result }
        }, result.error?.originalError);
        return null;
      }
    } catch (error) {
      logger.error('Unexpected error during KYC token generation', { userId: user.id }, error as Error);
      notifications.error({
        title: "Failed to start verification",
        description: "Could not initialize KYC verification. Please try again.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkKycStatus = useCallback(async () => {
    if (!user) {
      logger.warn('No user authenticated, cannot check KYC status');
      return null;
    }

    setIsLoading(true);
    logger.userAction('KYC Status Check', { userId: user.id });

    try {
      const result = await apiClient.invokeFunction('check-kyc-status', 
        {},
        { 
          showErrorToast: false, // Don't show toast for status checks
          context: { userId: user.id, operation: 'checkKycStatus' }
        }
      );

      if (result.success && result.data) {
        setKycStatus(result.data);
        logger.info('KYC status checked successfully', { 
          userId: user.id, 
          metadata: { status: result.data.status, level: result.data.level } 
        });
        return result.data;
      } else {
        logger.warn('KYC status check returned no data', { userId: user.id });
        return null;
      }
    } catch (error) {
      logger.error('Unexpected error during KYC status check', { userId: user.id }, error as Error);
      notifications.error({
        title: "Failed to check status",
        description: "Could not retrieve KYC verification status.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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