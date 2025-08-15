import { useWalletAuth } from "@/hooks/useWalletAuth";
import { Navigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/loading-state";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isConnected, user } = useWalletAuth();

  // Show loading while auth state is being determined
  if (isConnected && user === undefined) {
    return (
      <LoadingState size="lg" className="min-h-screen" />
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};