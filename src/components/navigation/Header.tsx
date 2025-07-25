import { MessageCircle, TrendingUp, Users, UserPlus, Settings, Wallet, ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { id: 'chats', label: 'Chats', icon: MessageCircle, path: '/' },
  { id: 'public-chats', label: 'Markets', icon: TrendingUp, path: '/public-chats' },
  { id: 'users', label: 'Traders', icon: Users, path: '/users' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const Header = () => {
  const { isConnected, currentUser, connect, disconnect, isConnecting, walletAddress } = useWallet();

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="hidden md:block border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">TradingChat</h1>
            
            {isConnected && (
              <nav className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isConnected && currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                      <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{currentUser.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatWalletAddress(walletAddress!)}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Account Settings
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect} className="text-red-600">
                    <Wallet className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={connect} 
                disabled={isConnecting}
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};