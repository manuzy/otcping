import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAppKitAccount } from '@reown/appkit/react';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  authenticateWallet: (signature: string, message: string, nonce: string) => Promise<{ success: boolean; error?: string }>;
  createWalletChallenge: () => Promise<{ message: string; nonce: string } | null>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAppKitAccount();

  // Track previous wallet address to detect changes
  const [previousAddress, setPreviousAddress] = useState<string | undefined>(address);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle wallet disconnection and address changes
  useEffect(() => {
    // If wallet disconnects while user is authenticated, sign them out
    if (!isConnected && user) {
      signOut();
    }
    
    // If wallet address changes while authenticated, sign out previous session
    if (isConnected && address && previousAddress && address !== previousAddress && user) {
      signOut();
    }
    
    // Update previous address
    setPreviousAddress(address);
  }, [isConnected, address, user, previousAddress]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const createWalletChallenge = async (): Promise<{ message: string; nonce: string } | null> => {
    if (!address) return null;

    try {
      const { data, error } = await supabase.rpc('create_wallet_challenge', {
        wallet_addr: address
      });

      if (error) throw error;
      
      const result = data as { success?: boolean; message?: string; nonce?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create challenge');
      }
      
      return { message: result.message!, nonce: result.nonce! };
    } catch (error) {
      console.error('Error creating wallet challenge:', error);
      return null;
    }
  };

  const authenticateWallet = async (signature: string, message: string, nonce: string): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'No wallet connected' };

    try {
      // Step 1: Verify signature with database function
      const { data, error } = await supabase.rpc('authenticate_wallet', {
        wallet_addr: address,
        signature_msg: message,
        user_signature: signature,
        nonce_value: nonce
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; wallet_address?: string; verification_nonce?: string };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Signature verification failed' };
      }

      // Step 2: Create or sign in user with Supabase Auth
      const email = address + '@wallet.local';
      const password = CryptoJS.SHA256(address).toString();

      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // User doesn't exist, create new user
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { 
              wallet_address: address,
              display_name: `${address.slice(0, 6)}...${address.slice(-4)}`
            }
          }
        });
        
        if (signUpError) {
          console.error('Sign up error:', signUpError);
          return { success: false, error: 'Failed to create user account' };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error authenticating wallet:', error);
      return { success: false, error: 'Authentication failed' };
    }
  };

  // Validate that the session is actually valid at the database level
  const validateSession = async (): Promise<boolean> => {
    try {
      if (!session?.access_token) {
        console.warn('No session or access token available');
        return false;
      }

      // Force refresh the session to ensure it's current
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      
      if (error || !refreshedSession) {
        console.warn('Session validation failed:', error);
        return false;
      }

      // Test database auth context by making a simple query
      const { data, error: testError } = await supabase
        .rpc('auth_uid_test')
        .maybeSingle();

      if (testError) {
        console.warn('Database auth context test failed:', testError);
        return false;
      }

      if (!data) {
        console.warn('auth.uid() returned null');
        return false;
      }

      console.log('Session validation successful, auth.uid():', data);
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    authenticateWallet,
    createWalletChallenge,
    validateSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}