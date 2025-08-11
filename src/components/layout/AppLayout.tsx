import { AppHeader } from "../navigation/AppHeader";
import { BottomTabs } from "../navigation/BottomTabs";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-16">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
};