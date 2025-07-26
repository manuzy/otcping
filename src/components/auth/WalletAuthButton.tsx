import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, Shield, X } from 'lucide-react';
import { useWalletClient } from 'wagmi';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export default function WalletAuthButton() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { user, createWalletChallenge, authenticateWallet } = useAuth();
  const { toast } = useToast();
  const { data: walletClient } = useWalletClient();
  const { isConnectedButNotAuthenticated, loading: authLoading } = useWalletAuth();

  const handleAuthenticate = async () => {
    if (!isConnected || !address) {
      open();
      return;
    }

    if (user) {
      toast({
        title: "Already authenticated",
        description: "You are already signed in with your wallet.",
      });
      return;
    }

    setIsAuthenticating(true);
    
    try {
      // Create challenge
      const challenge = await createWalletChallenge();
      if (!challenge) {
        throw new Error('Failed to create authentication challenge');
      }

      // Request signature from wallet
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      toast({
        title: "Sign Message",
        description: "Please sign the message in your wallet to authenticate.",
      });

      // Get real signature from wallet
      const signature = await walletClient.signMessage({ 
        message: challenge.message,
        account: address as `0x${string}`
      });

      // Authenticate with backend
      const result = await authenticateWallet(signature, challenge.message, challenge.nonce);
      
      if (result.success) {
        toast({
          title: "Authentication successful",
          description: "You have been signed in with your wallet.",
        });
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Failed to authenticate with wallet",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Show loading state during auth initialization
  if (authLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Initializing...
        </span>
      </div>
    );
  }

  if (user && isConnected) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-success/10 rounded-lg border border-success/20">
        <Shield className="h-4 w-4 text-success" />
        <span className="text-sm text-success font-medium">
          Authenticated: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      </div>
    );
  }

  // Show disconnect option if connected but not authenticated
  if (isConnectedButNotAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="flex items-center gap-2"
        >
          {isAuthenticating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Authenticate {address?.slice(0, 6)}...{address?.slice(-4)}
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => open()}
          title="Switch wallet"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleAuthenticate}
      disabled={isAuthenticating}
      className="flex items-center gap-2"
    >
      {isAuthenticating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      {isConnected ? 
        `Authenticate ${address?.slice(0, 6)}...${address?.slice(-4)}` : 
        'Connect Wallet'
      }
    </Button>
  );
}