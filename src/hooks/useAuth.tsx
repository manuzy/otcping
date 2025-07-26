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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAppKitAccount();

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
      const { data, error } = await supabase.rpc('authenticate_wallet', {
        wallet_addr: address,
        signature_msg: message,
        user_signature: signature,
        nonce_value: nonce
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; user_id?: string; secure_password?: string };
      
      if (result.success && result.secure_password) {
        // Use the secure password returned from the database
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: address + '@wallet.local',
          password: result.secure_password
        });

        if (signInError) {
          // Create the user if doesn't exist with the secure password
          const { error: signUpError } = await supabase.auth.signUp({
            email: address + '@wallet.local',
            password: result.secure_password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: { 
                wallet_address: address,
                secure_password: result.secure_password
              }
            }
          });
          
          if (signUpError) throw signUpError;
        }
      }

      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Error authenticating wallet:', error);
      return { success: false, error: 'Authentication failed' };
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    authenticateWallet,
    createWalletChallenge
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