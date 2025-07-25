import React, { createContext, useContext, useState, useEffect } from 'react';
import { walletConnectService } from '@/lib/walletConnect';
import { walletAuthService } from '@/lib/walletAuth';
import { useToast } from '@/hooks/use-toast';

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  currentUser: any | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  chainId: number | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const { toast } = useToast();

  // Real WalletConnect integration
  const connect = async () => {
    setIsConnecting(true);
    try {
      // Initialize WalletConnect if not already done
      const initialized = await walletConnectService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize WalletConnect');
      }

      // Connect to wallet
      const connection = await walletConnectService.connect();
      if (!connection) {
        throw new Error('Failed to connect wallet');
      }

      const { address, chainId: connectedChainId } = connection;
      
      // Check for existing session
      const existingSession = await walletAuthService.getWalletSession(address);
      
      if (existingSession) {
        // Use existing session
        setWalletAddress(address);
        setChainId(connectedChainId);
        setIsConnected(true);
        
        // Get user profile
        const profile = await walletAuthService.getOrCreateProfile(address);
        setCurrentUser(profile);
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      } else {
        // Create new authentication session
        const nonce = walletAuthService.generateNonce();
        const message = walletAuthService.createSignInMessage(address, nonce);
        
        // Request signature
        const signature = await walletConnectService.signMessage(message, address);
        if (!signature) {
          throw new Error('Failed to sign authentication message');
        }

        // Create wallet session
        const session = await walletAuthService.createWalletSession(address, signature, message, nonce);
        if (!session) {
          throw new Error('Failed to create authentication session');
        }

        // Set connection state
        setWalletAddress(address);
        setChainId(connectedChainId);
        setIsConnected(true);
        
        // Get or create user profile
        const profile = await walletAuthService.getOrCreateProfile(address);
        setCurrentUser(profile);

        toast({
          title: "Wallet Connected & Authenticated",
          description: `Successfully connected ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      if (walletAddress) {
        await walletAuthService.deleteWalletSession(walletAddress);
      }
      await walletConnectService.disconnect();
      
      setIsConnected(false);
      setWalletAddress(null);
      setCurrentUser(null);
      setChainId(null);

      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected from wallet",
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  // Initialize and check for existing connection on mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        // Initialize WalletConnect
        await walletConnectService.initialize();
        
        // Check for active sessions
        const activeSessions = walletConnectService.getActiveSessions();
        if (activeSessions.length > 0) {
          const session = activeSessions[0];
          const accounts = session.namespaces.eip155?.accounts || [];
          
          if (accounts.length > 0) {
            const accountData = accounts[0].split(':');
            const chainId = parseInt(accountData[1]);
            const address = accountData[2];
            
            // Verify we have a valid auth session
            const authSession = await walletAuthService.getWalletSession(address);
            if (authSession) {
              setWalletAddress(address);
              setChainId(chainId);
              setIsConnected(true);
              
              const profile = await walletAuthService.getOrCreateProfile(address);
              setCurrentUser(profile);
            }
          }
        }
        
        // Clean up expired sessions
        await walletAuthService.clearExpiredSessions();
      } catch (error) {
        console.error('Failed to initialize wallet context:', error);
      }
    };

    initializeWallet();
  }, []);

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    currentUser,
    connect,
    disconnect,
    isConnecting,
    chainId,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};