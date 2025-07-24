import { Button } from "@/components/ui/button";
import { Menu, Plus, MessageSquare } from "lucide-react";

interface WelcomeViewProps {
  onMenuClick: () => void;
}

export const WelcomeView = ({ onMenuClick }: WelcomeViewProps) => {
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
          <div className="mb-6">
            <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome to OTC Trades</h2>
            <p className="text-muted-foreground">
              Create peer-to-peer cryptocurrency trades with a chat-based interface. 
              Start by creating a new trade or selecting an existing chat.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button className="w-full" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create New Trade
            </Button>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to start trading
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};