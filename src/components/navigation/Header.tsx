import { MessageCircle, TrendingUp, Users, UserPlus, Settings, Wallet, ChevronDown, Loader2, Shield } from "lucide-react";
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: MessageCircle, path: '/app' },
  { id: 'public-chats', label: 'Markets', icon: TrendingUp, path: '/public-chats' },
  { id: 'users', label: 'Traders', icon: Users, path: '/users' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const Header = () => {
  const { open } = useAppKit();
  const { isConnected, address, isAuthenticated } = useWalletAuth();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<{ display_name: string; avatar?: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="hidden md:block border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">OTCping</h1>
            
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
                 
                 {/* Underground Admin Link - Only visible to Tom */}
                 {isAdmin && (
                   <NavLink
                     to="/underground"
                     className={({ isActive }) =>
                       cn(
                         "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                         isActive
                           ? "bg-destructive/10 text-destructive border border-destructive/20"
                           : "text-destructive/70 hover:text-destructive hover:bg-destructive/5 border border-destructive/10"
                       )
                     }
                   >
                     <Shield className="h-4 w-4" />
                     Underground
                   </NavLink>
                 )}
               </nav>
             )}
           </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && address ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar} />
                      <AvatarFallback>
                        {profile?.display_name?.charAt(0)?.toUpperCase() || address.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {profile?.display_name || 'User'}
                      </span>
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