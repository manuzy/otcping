import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet } from 'lucide-react';

export default function WalletAuthButton() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const { user, createWalletChallenge, authenticateWallet } = useAuth();
  const { toast } = useToast();

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
      // In a real implementation, you would use the wallet's signMessage function
      // For now, we'll simulate this step
      toast({
        title: "Sign Message",
        description: "Please sign the message in your wallet to authenticate.",
      });

      // Simulate wallet signature - in real implementation this would be:
      // const signature = await walletClient.signMessage({ message: challenge.message });
      const signature = "simulated_signature_" + Date.now();

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

  if (user) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
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
      {isConnected ? 'Authenticate Wallet' : 'Connect Wallet'}
    </Button>
  );
}