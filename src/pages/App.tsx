import { MainLayout } from "@/components/layout/MainLayout";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const App = () => {
  const { isAuthenticated, isConnected, user } = useWalletAuth();

  // Show loading while auth state is being determined
  if (isConnected && user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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