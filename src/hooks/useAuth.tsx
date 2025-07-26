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
  const [walletLoading, setWalletLoading] = useState(true);
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

  // Handle wallet loading state
  useEffect(() => {
    // Give Reown time to initialize and reconnect after page refresh
    const timer = setTimeout(() => {
      setWalletLoading(false);
    }, 2000); // 2 second grace period for wallet reconnection

    return () => clearTimeout(timer);
  }, []);

  // Handle wallet disconnection and address changes
  useEffect(() => {
    // Don't act on wallet state changes while wallet is still loading
    if (walletLoading) {
      console.log('[Auth] Wallet still loading, skipping disconnect check');
      return;
    }

    // If wallet disconnects while user is authenticated, sign them out
    // But only if we're sure the wallet is actually disconnected (not just loading)
    if (!isConnected && user && !walletLoading) {
      console.log('[Auth] Wallet disconnected, signing out user');
      signOut();
    }
    
    // If wallet address changes while authenticated, sign out previous session
    if (isConnected && address && previousAddress && address !== previousAddress && user) {
      console.log('[Auth] Wallet address changed, signing out previous session');
      signOut();
    }
    
    // Update previous address
    setPreviousAddress(address);
  }, [isConnected, address, user, previousAddress, walletLoading]);

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
      console.log('[Wallet Auth] Starting wallet authentication process...');
      
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

      console.log('[Wallet Auth] Signature verification successful, proceeding with Supabase auth...');

      // Step 2: Create or sign in user with Supabase Auth
      const email = address + '@wallet.local';
      const password = CryptoJS.SHA256(address).toString();

      let authResult;

      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.log('[Wallet Auth] User does not exist, creating new user...');
        // User doesn't exist, create new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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
          console.error('[Wallet Auth] Sign up error:', signUpError);
          return { success: false, error: 'Failed to create user account' };
        }
        authResult = signUpData;
      } else {
        console.log('[Wallet Auth] User sign-in successful');
        authResult = signInData;
      }

      // Step 3: Critical - Ensure session is properly established
      console.log('[Wallet Auth] Ensuring session is properly established...');
      
      // Force a session refresh to ensure the JWT token is properly set
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[Wallet Auth] Session refresh failed:', refreshError);
        return { success: false, error: 'Failed to establish session' };
      }

      if (!session) {
        console.error('[Wallet Auth] No session after refresh');
        return { success: false, error: 'Failed to establish session' };
      }

      console.log('[Wallet Auth] Session established successfully');

      // Step 4: Validate that auth context is working at database level
      console.log('[Wallet Auth] Validating database auth context...');
      
      // Wait a moment for token propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: authTest, error: authTestError } = await supabase.rpc('auth_uid_test');
      if (authTestError || !authTest) {
        console.error('[Wallet Auth] Database auth context validation failed:', authTestError);
        return { success: false, error: 'Authentication session not properly established' };
      }

      console.log('[Wallet Auth] Database auth context validated successfully, uid:', authTest);
      return { success: true };
    } catch (error) {
      console.error('[Wallet Auth] Error authenticating wallet:', error);
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
    loading: loading || walletLoading,
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