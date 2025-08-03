import { useAuth } from './useAuth';
import { useWalletAuth } from './useWalletAuth';

// Tom's user ID from the system
const ADMIN_USER_ID = '2f5dd2ac-16b8-4e42-b1d5-3990c6a96b8f';
const ADMIN_WALLET_ADDRESS = '0xcc5632847110bd050b3d6165d551ef9861c5634d';

export function useIsAdmin() {
  const { user } = useAuth();
  const { address } = useWalletAuth();
  
  return {
    isAdmin: user?.id === ADMIN_USER_ID,
    adminUserId: ADMIN_USER_ID,
    isAdminWallet: address?.toLowerCase() === ADMIN_WALLET_ADDRESS.toLowerCase()
  };
}