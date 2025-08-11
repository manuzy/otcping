import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { useAppKitAccount } from '@reown/appkit/react';
import CryptoJS from 'crypto-js';
import { logger } from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { notifications } from '@/lib/notifications';

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
      logger.debug('Wallet still loading, skipping disconnect check', { 
        component: 'useAuth',
        operation: 'walletStateCheck' 
      });
      return;
    }

    // If wallet disconnects while user is authenticated, sign them out
    if (!isConnected && user && !walletLoading) {
      logger.authEvent('Wallet disconnected, signing out user', { 
        userId: user.id,
        previousAddress 
      });
      signOut();
    }
    
    // If wallet address changes while authenticated, sign out previous session
    if (isConnected && address && previousAddress && address !== previousAddress && user) {
      logger.authEvent('Wallet address changed, signing out previous session', { 
        userId: user.id,
        oldAddress: previousAddress,
        newAddress: address 
      });
      signOut();
    }
    
    // Update previous address
    setPreviousAddress(address);
  }, [isConnected, address, user, previousAddress, walletLoading]);

  const signOut = async () => {
    logger.authEvent('User signing out', { userId: user?.id });
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      const appError = ErrorHandler.handle(error, false);
      logger.error('Sign out failed', { userId: user?.id }, appError);
    } else {
      logger.authEvent('User signed out successfully', { userId: user?.id });
      notifications.signedOut();
    }
  };

  const createWalletChallenge = async (): Promise<{ message: string; nonce: string } | null> => {
    if (!address) return null;

    logger.apiCall('create_wallet_challenge', 'supabase.rpc', { 
      component: 'useAuth',
      walletAddress: address 
    });

    try {
      const { data, error } = await supabase.rpc('create_wallet_challenge', {
        wallet_addr: address
      });

      if (error) throw error;
      
      const result = data as { success?: boolean; message?: string; nonce?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create challenge');
      }
      
      logger.apiSuccess('create_wallet_challenge', { walletAddress: address });
      return { message: result.message!, nonce: result.nonce! };
    } catch (error) {
      const appError = ErrorHandler.handle(error, false);
      logger.apiError('create_wallet_challenge', appError, { walletAddress: address });
      return null;
    }
  };

  const authenticateWallet = async (signature: string, message: string, nonce: string): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'No wallet connected' };

    logger.authEvent('Starting wallet authentication process', { 
      component: 'useAuth',
      walletAddress: address 
    });

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

      // Step 4: Enhanced database auth context validation with connection-level testing
      console.log('[Wallet Auth] Validating database auth context with connection-level testing...');
      
      // Wait for token propagation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a dedicated client with explicit auth headers for testing
      const testClient = createClient(
        'https://peqqefvohjemxhuyvzbg.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcXFlZnZvaGplbXhodXl2emJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjM1NjAsImV4cCI6MjA2ODkzOTU2MH0.YPJYJrYziXv8b3oy3kyDKnIuK4Gknl_iTP95I4OAO9o',
        {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
          },
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        }
      );

      // Test connection-level auth context
      const { data: authTest, error: authTestError } = await testClient.rpc('auth_uid_test');
      if (authTestError || !authTest) {
        console.error('[Wallet Auth] Connection-level database auth context validation failed:', authTestError);
        return { success: false, error: 'Authentication session not properly established at connection level' };
      }

      console.log('[Wallet Auth] Connection-level database auth context validated successfully, uid:', authTest);
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