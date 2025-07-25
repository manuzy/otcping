import { MainLayout } from "@/components/layout/MainLayout";
import { useWallet } from "@/hooks/useWallet";
import { WelcomeView } from "@/components/chat/WelcomeView";

const Index = () => {
  const { isConnected } = useWallet();
  
  // Show welcome/connect view if wallet not connected
  if (!isConnected) {
    return <WelcomeView onMenuClick={() => {}} />;
  }
  
  return <MainLayout />;
};

export default Index;
