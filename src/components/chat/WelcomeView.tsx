import { Button } from "@/components/ui/button";
import { Menu, Plus, MessageSquare, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface WelcomeViewProps {
  onMenuClick: () => void;
}

export const WelcomeView = ({ onMenuClick }: WelcomeViewProps) => {
  const { isConnected, currentUser, connect, isConnecting } = useWallet();

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
          {!isConnected ? (
            <>
              <div className="mb-6">
                <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-muted-foreground">
                  Connect your wallet to start trading cryptocurrency with peers through our secure chat interface.
                </p>
              </div>
              
              <Button 
                className="w-full" 
                size="lg" 
                onClick={connect}
                disabled={isConnecting}
              >
                <Wallet className="h-5 w-5 mr-2" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Welcome back, {currentUser?.displayName}!</h2>
                <p className="text-muted-foreground">
                  Start by creating a new trade or selecting an existing chat from the sidebar.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full" size="lg">
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