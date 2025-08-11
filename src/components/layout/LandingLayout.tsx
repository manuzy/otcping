import { LandingHeader } from "../navigation/LandingHeader";
import Footer from "./Footer";

interface LandingLayoutProps {
  children: React.ReactNode;
}

export const LandingLayout = ({ children }: LandingLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
};