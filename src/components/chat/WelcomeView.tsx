import { Button } from "@/components/ui/button";
import { Menu, Plus, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import WalletAuthButton from "@/components/auth/WalletAuthButton";
import { useAuth } from "@/hooks/useAuth";

interface WelcomeViewProps {
  onMenuClick: () => void;
}

export const WelcomeView = ({ onMenuClick }: WelcomeViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border md:hidden">
        <h1 className="text-lg font-semibold">OTC Trades</h1>
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Welcome Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {!user ? (
            <div className="space-y-6">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Welcome to OTC Trades</h2>
                <p className="text-muted-foreground">
                  Secure peer-to-peer cryptocurrency trading platform
                </p>
                <p className="text-muted-foreground mt-2">
                  Connect and authenticate your wallet to start trading.
                </p>
              </div>
              <WalletAuthButton />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                <p className="text-muted-foreground">
                  Your wallet is authenticated and ready for trading.
                </p>
                <p className="text-muted-foreground mt-2">
                  Start by creating a new trade or selecting an existing chat from the sidebar.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={() => navigate("/create-trade")}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Trade
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};