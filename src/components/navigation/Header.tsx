import { MessageCircle, TrendingUp, Users, UserPlus, Settings, Wallet, ChevronDown, Loader2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppKit } from '@reown/appkit/react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAuth } from "@/hooks/useAuth";
import WalletAuthButton from "@/components/auth/WalletAuthButton";

const navItems = [
  { id: 'chats', label: 'Chats', icon: MessageCircle, path: '/' },
  { id: 'public-chats', label: 'Markets', icon: TrendingUp, path: '/public-chats' },
  { id: 'users', label: 'Traders', icon: Users, path: '/users' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const Header = () => {
  const { open } = useAppKit();
  const { isConnected, address, isAuthenticated } = useWalletAuth();
  const { signOut } = useAuth();

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="hidden md:block border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">TradingChat</h1>
            
            {isAuthenticated && (
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
            {isAuthenticated && address ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{address.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">User</span>
                      <span className="text-xs text-muted-foreground">
                        {formatWalletAddress(address)}
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
                  <DropdownMenuItem onClick={() => open()}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Manage Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <WalletAuthButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};