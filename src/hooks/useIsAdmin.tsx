import { useAuth } from './useAuth';

// Tom's user ID from the system
const ADMIN_USER_ID = '2f5dd2ac-16b8-4e42-b1d5-3990c6a96b8f';

export function useIsAdmin() {
  const { user } = useAuth();
  
  return {
    isAdmin: user?.id === ADMIN_USER_ID,
    adminUserId: ADMIN_USER_ID
  };
}