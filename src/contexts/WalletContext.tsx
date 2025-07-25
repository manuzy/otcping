import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { mockUsers } from '@/data/mockData';

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  currentUser: User | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Simulate wallet connection
  const connect = async () => {
    setIsConnecting(true);
    try {
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock wallet address - in real app this would come from wallet
      const mockWalletAddress = "0x1234567890123456789012345678901234567890";
      setWalletAddress(mockWalletAddress);
      setIsConnected(true);
      
      // Find or create user for this wallet address
      let user = mockUsers.find(u => u.walletAddress === mockWalletAddress);
      if (!user) {
        // Create new user for this wallet
        user = {
          ...mockUsers[0], // Use first user as template
          id: `user_${Date.now()}`,
          walletAddress: mockWalletAddress,
          displayName: `User ${mockWalletAddress.slice(-4)}`,
          contacts: [],
        };
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setCurrentUser(null);
  };

  // Check for existing connection on mount
  useEffect(() => {
    // In real app, check if wallet is already connected
    // For now, start disconnected
  }, []);

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    currentUser,
    connect,
    disconnect,
    isConnecting,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};