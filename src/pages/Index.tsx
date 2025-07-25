import { MainLayout } from "@/components/layout/MainLayout";
import { WelcomeView } from "@/components/chat/WelcomeView";
import { useAppKitAccount } from '@reown/appkit/react';

const Index = () => {
  const { isConnected } = useAppKitAccount();
  
  // Show welcome/connect view if wallet not connected
  if (!isConnected) {
    return <WelcomeView onMenuClick={() => {}} />;
  }
  
  return <MainLayout />;
};

export default Index;
