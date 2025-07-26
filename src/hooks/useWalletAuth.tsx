import { useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from './useAuth';

export function useWalletAuth() {
  const { address, isConnected } = useAppKitAccount();
  const { user } = useAuth();

  return {
    isConnected,
    address,
    user,
    isAuthenticated: !!user
  };
}