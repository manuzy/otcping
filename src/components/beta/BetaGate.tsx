import { ReactNode } from 'react';
import { useBetaAccess } from '@/hooks/useBetaAccess';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BetaAccessPage } from './BetaAccessPage';

interface BetaGateProps {
  children: ReactNode;
}

export function BetaGate({ children }: BetaGateProps) {
  const { hasAccess, isBetaActive, loading } = useBetaAccess();

  // Show loading while checking access
  if (loading) {
    return (
      <div className="flex-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If beta is active and user doesn't have access, show beta page
  if (isBetaActive && !hasAccess) {
    return <BetaAccessPage />;
  }

  // Otherwise, render the app normally
  return <>{children}</>;
}
