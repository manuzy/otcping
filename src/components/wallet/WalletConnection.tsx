import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, XCircle } from "lucide-react";

export const WalletConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate MetaMask connection
    try {
      // In real implementation, this would be:
      // await connector.connect()
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Connected</span>
            <Badge variant="outline" className="text-xs">MetaMask</Badge>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 truncate">
            0x1234...5678
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDisconnect}
          className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      variant="outline"
      className="w-full"
      size="sm"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
};