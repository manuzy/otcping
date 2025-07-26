import { useEffect, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useWalletAuth() {
  const { address, isConnected } = useAppKitAccount();
  const { user, createWalletChallenge, authenticateWallet } = useAuth();
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Auto-authenticate when wallet connects and user is not authenticated
  useEffect(() => {
    const handleAutoAuth = async () => {
      // Only proceed if wallet is connected, user is not authenticated, and not already authenticating
      if (!isConnected || !address || user || isAuthenticating) {
        return;
      }

      setIsAuthenticating(true);
      
      try {
        // Create challenge
        const challenge = await createWalletChallenge();
        if (!challenge) {
          throw new Error('Failed to create authentication challenge');
        }

        // Import walletClient dynamically to avoid SSR issues
        const { getWalletClient } = await import('@wagmi/core');
        const { wagmiAdapter } = await import('@/lib/appkit');
        
        const walletClient = await getWalletClient(wagmiAdapter.wagmiConfig);
        
        if (!walletClient) {
          throw new Error('Wallet client not available');
        }

        toast({
          title: "Authenticating wallet",
          description: "Please sign the message in your wallet to complete authentication.",
        });

        // Get signature from wallet
        const signature = await walletClient.signMessage({ 
          message: challenge.message,
          account: address as `0x${string}`
        });

        // Authenticate with backend
        const result = await authenticateWallet(signature, challenge.message, challenge.nonce);
        
        if (result.success) {
          toast({
            title: "Authentication successful",
            description: "Your wallet has been authenticated successfully.",
          });
        } else {
          throw new Error(result.error || 'Authentication failed');
        }
      } catch (error) {
        console.error('Auto-authentication error:', error);
        // Only show error toast if it's not a user rejection
        if (error instanceof Error && !error.message.includes('User rejected')) {
          toast({
            title: "Authentication failed",
            description: error.message || "Failed to authenticate wallet automatically",
            variant: "destructive",
          });
        }
      } finally {
        setIsAuthenticating(false);
      }
    };

    // Small delay to ensure wallet connection is fully established
    if (isConnected && address && !user) {
      const timeoutId = setTimeout(handleAutoAuth, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, address, user, isAuthenticating, createWalletChallenge, authenticateWallet, toast]);

  return {
    isConnected,
    address,
    user,
    isAuthenticating,
    isAuthenticated: !!user
  };
}