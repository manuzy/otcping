import { MainLayout } from "@/components/layout/MainLayout";
import { WelcomeView } from "@/components/chat/WelcomeView";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const Index = () => {
  const { isAuthenticated } = useWalletAuth();
  
  // Show welcome/connect view if wallet not authenticated
  if (!isAuthenticated) {
    return <WelcomeView onMenuClick={() => {}} />;
  }
  
  return <MainLayout />;
};

export default Index;
