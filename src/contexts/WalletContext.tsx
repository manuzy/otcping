import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface WalletContextType {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  
  // Wallet state  
  isWalletConnected: boolean;
  walletAddress: string | null;
  currentUser: any | null; // Profile from database
  
  // Legacy compatibility (for existing components)
  isConnected: boolean;
  
  // Auth functions
  signOut: () => Promise<void>;
  
  // Wallet functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connect: () => Promise<void>; // Legacy compatibility
  disconnect: () => void; // Legacy compatibility
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

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Wallet state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setCurrentUser(null);
          setWalletAddress(null);
          setIsWalletConnected(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        setCurrentUser(profile);
        if (profile.wallet_address) {
          setWalletAddress(profile.wallet_address);
          setIsWalletConnected(true);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setWalletAddress(null);
      setIsWalletConnected(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const connectWallet = async () => {
    if (!user) {
      console.error('User must be authenticated to connect wallet');
      return;
    }

    setIsConnecting(true);
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockWalletAddress = "0x1234567890123456789012345678901234567890";
      
      // Update user profile with wallet address
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: mockWalletAddress })
        .eq('id', user.id);

      if (error) throw error;

      setWalletAddress(mockWalletAddress);
      setIsWalletConnected(true);
      
      // Refresh user profile
      await loadUserProfile(user.id);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!user) return;

    try {
      // Remove wallet address from profile
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: null })
        .eq('id', user.id);

      if (error) throw error;

      setIsWalletConnected(false);
      setWalletAddress(null);
      
      // Refresh user profile
      await loadUserProfile(user.id);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  // Legacy compatibility functions
  const connect = connectWallet;
  const disconnect = () => {
    if (isWalletConnected) {
      disconnectWallet();
    } else {
      signOut();
    }
  };

  return (
    <WalletContext.Provider
      value={{
        // Auth state
        isAuthenticated: !!user,
        user,
        session,
        
        // Wallet state
        isWalletConnected,
        walletAddress,
        currentUser,
        
        // Legacy compatibility
        isConnected: !!user, // Consider authenticated as "connected"
        
        // Auth functions
        signOut,
        
        // Wallet functions
        connectWallet,
        disconnectWallet,
        connect,
        disconnect,
        isConnecting,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};