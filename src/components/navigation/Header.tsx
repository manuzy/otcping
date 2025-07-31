import { MessageCircle, TrendingUp, Users, UserPlus, Settings, Wallet, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
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
import { useTotalUnreadCount } from "@/hooks/useTotalUnreadCount";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { id: 'dashboard', label: 'Chat', icon: MessageCircle, path: '/app' },
  { id: 'public-trades', label: 'Markets', icon: TrendingUp, path: '/public-trades' },
  { id: 'users', label: 'Traders', icon: Users, path: '/users' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const Header = () => {
  const { open } = useAppKit();
  const { isConnected, address, isAuthenticated } = useWalletAuth();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { totalUnreadCount } = useTotalUnreadCount();
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
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <svg width="120" height="29" viewBox="0 0 483 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8">
                <g clipPath="url(#clip0_1013_16)">
                  <rect width="483" height="116" fill="white"/>
                  <path d="M141.841 55.14C141.841 57.84 142.141 60.48 142.741 63.06C143.401 65.58 144.421 67.86 145.801 69.9C147.181 71.94 148.981 73.59 151.201 74.85C153.421 76.05 156.121 76.65 159.301 76.65C162.481 76.65 165.181 76.05 167.401 74.85C169.621 73.59 171.421 71.94 172.801 69.9C174.181 67.86 175.171 65.58 175.771 63.06C176.431 60.48 176.761 57.84 176.761 55.14C176.761 52.32 176.431 49.59 175.771 46.95C175.171 44.31 174.181 41.97 172.801 39.93C171.421 37.83 169.621 36.18 167.401 34.98C165.181 33.72 162.481 33.09 159.301 33.09C156.121 33.09 153.421 33.72 151.201 34.98C148.981 36.18 147.181 37.83 145.801 39.93C144.421 41.97 143.401 44.31 142.741 46.95C142.141 49.59 141.841 52.32 141.841 55.14ZM127.711 55.14C127.711 50.34 128.431 45.9 129.871 41.82C131.311 37.68 133.381 34.08 136.081 31.02C138.781 27.96 142.081 25.56 145.981 23.82C149.941 22.08 154.381 21.21 159.301 21.21C164.281 21.21 168.721 22.08 172.621 23.82C176.521 25.56 179.821 27.96 182.521 31.02C185.221 34.08 187.291 37.68 188.731 41.82C190.171 45.9 190.891 50.34 190.891 55.14C190.891 59.82 190.171 64.2 188.731 68.28C187.291 72.3 185.221 75.81 182.521 78.81C179.821 81.81 176.521 84.18 172.621 85.92C168.721 87.6 164.281 88.44 159.301 88.44C154.381 88.44 149.941 87.6 145.981 85.92C142.081 84.18 138.781 81.81 136.081 78.81C133.381 75.81 131.311 72.3 129.871 68.28C128.431 64.2 127.711 59.82 127.711 55.14ZM214.77 34.62H195.51V22.74H248.16V34.62H228.9V87H214.77V34.62ZM298.409 44.34C298.169 42.72 297.629 41.25 296.789 39.93C295.949 38.55 294.899 37.35 293.639 36.33C292.379 35.31 290.939 34.53 289.319 33.99C287.759 33.39 286.109 33.09 284.369 33.09C281.189 33.09 278.489 33.72 276.269 34.98C274.049 36.18 272.249 37.83 270.869 39.93C269.489 41.97 268.469 44.31 267.809 46.95C267.209 49.59 266.909 52.32 266.909 55.14C266.909 57.84 267.209 60.48 267.809 63.06C268.469 65.58 269.489 67.86 270.869 69.9C272.249 71.94 274.049 73.59 276.269 74.85C278.489 76.05 281.189 76.65 284.369 76.65C288.689 76.65 292.049 75.33 294.449 72.69C296.909 70.05 298.409 66.57 298.949 62.25H312.629C312.269 66.27 311.339 69.9 309.839 73.14C308.339 76.38 306.359 79.14 303.899 81.42C301.439 83.7 298.559 85.44 295.259 86.64C291.959 87.84 288.329 88.44 284.369 88.44C279.449 88.44 275.009 87.6 271.049 85.92C267.149 84.18 263.849 81.81 261.149 78.81C258.449 75.81 256.379 72.3 254.939 68.28C253.499 64.2 252.779 59.82 252.779 55.14C252.779 50.34 253.499 45.9 254.939 41.82C256.379 37.68 258.449 34.08 261.149 31.02C263.849 27.96 267.149 25.56 271.049 23.82C275.009 22.08 279.449 21.21 284.369 21.21C287.909 21.21 291.239 21.72 294.359 22.74C297.539 23.76 300.359 25.26 302.819 27.24C305.339 29.16 307.409 31.56 309.029 34.44C310.649 37.32 311.669 40.62 312.089 44.34H298.409ZM321.468 40.56H326.688V49.38H326.868C328.188 46.14 330.318 43.65 333.258 41.91C336.258 40.11 339.648 39.21 343.428 39.21C346.968 39.21 350.028 39.87 352.608 41.19C355.248 42.51 357.438 44.31 359.178 46.59C360.918 48.81 362.208 51.42 363.048 54.42C363.888 57.36 364.308 60.48 364.308 63.78C364.308 67.08 363.888 70.23 363.048 73.23C362.208 76.17 360.918 78.78 359.178 81.06C357.438 83.28 355.248 85.05 352.608 86.37C350.028 87.63 346.968 88.26 343.428 88.26C341.748 88.26 340.068 88.05 338.388 87.63C336.708 87.21 335.148 86.58 333.708 85.74C332.268 84.9 330.978 83.85 329.838 82.59C328.758 81.33 327.918 79.86 327.318 78.18H327.138V104.1H321.468V40.56ZM358.638 63.78C358.638 61.38 358.338 59.01 357.738 56.67C357.198 54.27 356.298 52.14 355.038 50.28C353.838 48.42 352.278 46.92 350.358 45.78C348.438 44.58 346.128 43.98 343.428 43.98C340.308 43.98 337.698 44.52 335.598 45.6C333.498 46.68 331.818 48.12 330.558 49.92C329.298 51.72 328.398 53.82 327.858 56.22C327.378 58.62 327.138 61.14 327.138 63.78C327.138 66.18 327.408 68.58 327.948 70.98C328.548 73.32 329.478 75.42 330.738 77.28C332.058 79.14 333.738 80.67 335.778 81.87C337.878 83.01 340.428 83.58 343.428 83.58C346.128 83.58 348.438 83.01 350.358 81.87C352.278 80.67 353.838 79.14 355.038 77.28C356.298 75.42 357.198 73.32 357.738 70.98C358.338 68.58 358.638 66.18 358.638 63.78ZM373.238 22.74H378.908V31.83H373.238V22.74ZM373.238 40.56H378.908V87H373.238V40.56ZM389.669 40.56H395.339V48.57H395.519C396.599 45.75 398.519 43.5 401.279 41.82C404.039 40.08 407.069 39.21 410.369 39.21C413.609 39.21 416.309 39.63 418.469 40.47C420.689 41.31 422.459 42.51 423.779 44.07C425.099 45.57 426.029 47.43 426.569 49.65C427.109 51.87 427.379 54.36 427.379 57.12V87H421.709V58.02C421.709 56.04 421.529 54.21 421.169 52.53C420.809 50.79 420.179 49.29 419.279 48.03C418.379 46.77 417.149 45.78 415.589 45.06C414.089 44.34 412.199 43.98 409.919 43.98C407.639 43.98 405.599 44.4 403.799 45.24C402.059 46.02 400.559 47.13 399.299 48.57C398.099 49.95 397.139 51.63 396.419 53.61C395.759 55.53 395.399 57.63 395.339 59.91V87H389.669V40.56ZM477.339 83.22C477.339 86.64 476.949 89.73 476.169 92.49C475.449 95.25 474.279 97.59 472.659 99.51C471.039 101.43 468.909 102.9 466.269 103.92C463.689 104.94 460.509 105.45 456.729 105.45C454.389 105.45 452.109 105.18 449.889 104.64C447.669 104.1 445.659 103.26 443.859 102.12C442.119 100.98 440.649 99.51 439.449 97.71C438.309 95.97 437.649 93.87 437.469 91.41H443.139C443.439 93.15 444.009 94.59 444.849 95.73C445.749 96.93 446.799 97.89 447.999 98.61C449.259 99.33 450.639 99.84 452.139 100.14C453.639 100.5 455.169 100.68 456.729 100.68C462.009 100.68 465.819 99.18 468.159 96.18C470.499 93.18 471.669 88.86 471.669 83.22V76.92H471.489C470.169 79.8 468.219 82.11 465.639 83.85C463.119 85.59 460.149 86.46 456.729 86.46C453.009 86.46 449.829 85.86 447.189 84.66C444.549 83.4 442.359 81.69 440.619 79.53C438.939 77.37 437.709 74.85 436.929 71.97C436.149 69.03 435.759 65.91 435.759 62.61C435.759 59.43 436.209 56.43 437.109 53.61C438.069 50.73 439.419 48.24 441.159 46.14C442.959 43.98 445.149 42.3 447.729 41.1C450.369 39.84 453.369 39.21 456.729 39.21C458.469 39.21 460.089 39.45 461.589 39.93C463.149 40.41 464.559 41.1 465.819 42C467.079 42.84 468.189 43.83 469.149 44.97C470.169 46.11 470.949 47.31 471.489 48.57H471.669V40.56H477.339V83.22ZM456.729 81.69C459.189 81.69 461.349 81.18 463.209 80.16C465.069 79.08 466.629 77.7 467.889 76.02C469.149 74.28 470.079 72.3 470.679 70.08C471.339 67.86 471.669 65.58 471.669 63.24C471.669 60.96 471.399 58.68 470.859 56.4C470.319 54.12 469.449 52.05 468.249 50.19C467.049 48.33 465.489 46.83 463.569 45.69C461.709 44.55 459.429 43.98 456.729 43.98C454.029 43.98 451.719 44.55 449.799 45.69C447.879 46.77 446.289 48.21 445.029 50.01C443.769 51.81 442.839 53.88 442.239 56.22C441.699 58.5 441.429 60.84 441.429 63.24C441.429 65.58 441.729 67.86 442.329 70.08C442.929 72.3 443.859 74.28 445.119 76.02C446.379 77.7 447.969 79.08 449.889 80.16C451.809 81.18 454.089 81.69 456.729 81.69Z" fill="black"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.4375 35C16.4375 19.1218 29.3093 6.25 45.1875 6.25H89.75C105.628 6.25 118.5 19.1218 118.5 35V81C118.5 96.8782 105.628 109.75 89.75 109.75H9.25001C7.13691 109.75 5.19407 108.591 4.19024 106.732C3.18642 104.872 3.28337 102.612 4.44273 100.845L13.6093 86.8771C15.4545 84.0654 16.4375 80.7758 16.4375 77.4127V35ZM45.1875 17.75C35.6606 17.75 27.9375 25.4731 27.9375 35V77.4127C27.9375 83.0178 26.2991 88.5005 23.2239 93.1866L19.901 98.25H89.75C99.2769 98.25 107 90.5269 107 81V35C107 25.4731 99.2769 17.75 89.75 17.75H45.1875Z" fill="#00B262"/>
                  <circle cx="54.0928" cy="75.0928" r="12.0928" fill="black"/>
                  <circle cx="78.0928" cy="42.0928" r="11.0928" stroke="black" strokeWidth="2"/>
                </g>
                <defs>
                  <clipPath id="clip0_1013_16">
                    <rect width="483" height="116" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </Link>
            
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
                           "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                           isActive
                             ? "bg-primary/10 text-primary"
                             : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                         )
                       }
                     >
                       <Icon className="h-4 w-4" />
                       {item.label}
                       {item.id === 'dashboard' && totalUnreadCount > 0 && (
                         <Badge 
                           variant="destructive" 
                           className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center rounded-full"
                         >
                           {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                         </Badge>
                       )}
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
                     <ShieldCheck className="h-4 w-4" />
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