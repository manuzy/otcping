import { supabase } from '@/integrations/supabase/client';

export interface WalletSession {
  id: string;
  walletAddress: string;
  signature: string;
  message: string;
  nonce: string;
  expiresAt: string;
}

export class WalletAuthService {
  
  generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  createSignInMessage(walletAddress: string, nonce: string): string {
    const domain = window.location.host;
    const statement = 'Sign in to OTC Trades';
    const uri = window.location.origin;
    const version = '1';
    const chainId = '1';
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    return `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
  }

  async createWalletSession(
    walletAddress: string, 
    signature: string, 
    message: string, 
    nonce: string
  ): Promise<WalletSession | null> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const { data, error } = await supabase
        .from('wallet_sessions')
        .insert({
          wallet_address: walletAddress,
          signature,
          message,
          nonce,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create wallet session:', error);
        return null;
      }

      return {
        id: data.id,
        walletAddress: data.wallet_address,
        signature: data.signature,
        message: data.message,
        nonce: data.nonce,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('Error creating wallet session:', error);
      return null;
    }
  }

  async getWalletSession(walletAddress: string): Promise<WalletSession | null> {
    try {
      const { data, error } = await supabase
        .from('wallet_sessions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        walletAddress: data.wallet_address,
        signature: data.signature,
        message: data.message,
        nonce: data.nonce,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('Error getting wallet session:', error);
      return null;
    }
  }

  async getOrCreateProfile(walletAddress: string) {
    try {
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (existingProfile && !fetchError) {
        return existingProfile;
      }

      // Create new profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          wallet_address: walletAddress,
          display_name: `User ${walletAddress.slice(-4)}`,
          is_public: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        return null;
      }

      return newProfile;
    } catch (error) {
      console.error('Error managing profile:', error);
      return null;
    }
  }

  async clearExpiredSessions() {
    try {
      const { error } = await supabase
        .from('wallet_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Failed to clear expired sessions:', error);
      }
    } catch (error) {
      console.error('Error clearing expired sessions:', error);
    }
  }

  async deleteWalletSession(walletAddress: string) {
    try {
      const { error } = await supabase
        .from('wallet_sessions')
        .delete()
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Failed to delete wallet session:', error);
      }
    } catch (error) {
      console.error('Error deleting wallet session:', error);
    }
  }
}

export const walletAuthService = new WalletAuthService();