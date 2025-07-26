import { useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from './useAuth';

export function useWalletAuth() {
  const { address, isConnected } = useAppKitAccount();
  const { user } = useAuth();

  return {
    isConnected,
    address,
    user,
    // User is authenticated only if they have both a wallet connection AND Supabase auth
    isAuthenticated: !!(user && isConnected && address),
    // Check if wallet is connected but not yet authenticated
    isConnectedButNotAuthenticated: !!(isConnected && address && !user)
  };
}