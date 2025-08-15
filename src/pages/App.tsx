import { MainLayout } from "@/components/layout/MainLayout";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const App = () => {
  const { isAuthenticated, isConnected, user } = useWalletAuth();

  // Show loading while auth state is being determined
  if (isConnected && user === undefined) {
    return (
      <div className="flex-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <MainLayout />;
};

export default App;