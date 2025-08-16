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
import { SearchButton } from "@/components/search/SearchButton";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTotalUnreadCount } from "@/hooks/useTotalUnreadCount";
import { Badge } from "@/components/ui/badge";
import { logger } from '@/lib/logger';

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
      logger.error('Error fetching profile', {
        component: 'Header',
        operation: 'fetch_profile',
        userId: user?.id
      }, error as Error);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="hidden md:block sticky top-0 z-modal border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <svg width="133" height="29" viewBox="0 0 534 116" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8">
                <g clipPath="url(#clip0_1013_16)">
                  <rect width="534" height="116" fill="white"/>
                  <path d="M165.841 62.14C165.841 64.84 166.141 67.48 166.741 70.06C167.401 72.58 168.421 74.86 169.801 76.9C171.181 78.94 172.981 80.59 175.201 81.85C177.421 83.05 180.121 83.65 183.301 83.65C186.481 83.65 189.181 83.05 191.401 81.85C193.621 80.59 195.421 78.94 196.801 76.9C198.181 74.86 199.171 72.58 199.771 70.06C200.431 67.48 200.761 64.84 200.761 62.14C200.761 59.32 200.431 56.59 199.771 53.95C199.171 51.31 198.181 48.97 196.801 46.93C195.421 44.83 193.621 43.18 191.401 41.98C189.181 40.72 186.481 40.09 183.301 40.09C180.121 40.09 177.421 40.72 175.201 41.98C172.981 43.18 171.181 44.83 169.801 46.93C168.421 48.97 167.401 51.31 166.741 53.95C166.141 56.59 165.841 59.32 165.841 62.14ZM151.711 62.14C151.711 57.34 152.431 52.9 153.871 48.82C155.311 44.68 157.381 41.08 160.081 38.02C162.781 34.96 166.081 32.56 169.981 30.82C173.941 29.08 178.381 28.21 183.301 28.21C188.281 28.21 192.721 29.08 196.621 30.82C200.521 32.56 203.821 34.96 206.521 38.02C209.221 41.08 211.291 44.68 212.731 48.82C214.171 52.9 214.891 57.34 214.891 62.14C214.891 66.82 214.171 71.2 212.731 75.28C211.291 79.3 209.221 82.81 206.521 85.81C203.821 88.81 200.521 91.18 196.621 92.92C192.721 94.6 188.281 95.44 183.301 95.44C178.381 95.44 173.941 94.6 169.981 92.92C166.081 91.18 162.781 88.81 160.081 85.81C157.381 82.81 155.311 79.3 153.871 75.28C152.431 71.2 151.711 66.82 151.711 62.14ZM238.77 41.62H219.51V29.74H272.16V41.62H252.9V94H238.77V41.62ZM322.409 51.34C322.169 49.72 321.629 48.25 320.789 46.93C319.949 45.55 318.899 44.35 317.639 43.33C316.379 42.31 314.939 41.53 313.319 40.99C311.759 40.39 310.109 40.09 308.369 40.09C305.189 40.09 302.489 40.72 300.269 41.98C298.049 43.18 296.249 44.83 294.869 46.93C293.489 48.97 292.469 51.31 291.809 53.95C291.209 56.59 290.909 59.32 290.909 62.14C290.909 64.84 291.209 67.48 291.809 70.06C292.469 72.58 293.489 74.86 294.869 76.9C296.249 78.94 298.049 80.59 300.269 81.85C302.489 83.05 305.189 83.65 308.369 83.65C312.689 83.65 316.049 82.33 318.449 79.69C320.909 77.05 322.409 73.57 322.949 69.25H336.629C336.269 73.27 335.339 76.9 333.839 80.14C332.339 83.38 330.359 86.14 327.899 88.42C325.439 90.7 322.559 92.44 319.259 93.64C315.959 94.84 312.329 95.44 308.369 95.44C303.449 95.44 299.009 94.6 295.049 92.92C291.149 91.18 287.849 88.81 285.149 85.81C282.449 82.81 280.379 79.3 278.939 75.28C277.499 71.2 276.779 66.82 276.779 62.14C276.779 57.34 277.499 52.9 278.939 48.82C280.379 44.68 282.449 41.08 285.149 38.02C287.849 34.96 291.149 32.56 295.049 30.82C299.009 29.08 303.449 28.21 308.369 28.21C311.909 28.21 315.239 28.72 318.359 29.74C321.539 30.76 324.359 32.26 326.819 34.24C329.339 36.16 331.409 38.56 333.029 41.44C334.649 44.32 335.669 47.62 336.089 51.34H322.409ZM345.468 47.56H350.688V56.38H350.868C352.188 53.14 354.318 50.65 357.258 48.91C360.258 47.11 363.648 46.21 367.428 46.21C370.968 46.21 374.028 46.87 376.608 48.19C379.248 49.51 381.438 51.31 383.178 53.59C384.918 55.81 386.208 58.42 387.048 61.42C387.888 64.36 388.308 67.48 388.308 70.78C388.308 74.08 387.888 77.23 387.048 80.23C386.208 83.17 384.918 85.78 383.178 88.06C381.438 90.28 379.248 92.05 376.608 93.37C374.028 94.63 370.968 95.26 367.428 95.26C365.748 95.26 364.068 95.05 362.388 94.63C360.708 94.21 359.148 93.58 357.708 92.74C356.268 91.9 354.978 90.85 353.838 89.59C352.758 88.33 351.918 86.86 351.318 85.18H351.138V111.1H345.468V47.56ZM382.638 70.78C382.638 68.38 382.338 66.01 381.738 63.67C381.198 61.27 380.298 59.14 379.038 57.28C377.838 55.42 376.278 53.92 374.358 52.78C372.438 51.58 370.128 50.98 367.428 50.98C364.308 50.98 361.698 51.52 359.598 52.6C357.498 53.68 355.818 55.12 354.558 56.92C353.298 58.72 352.398 60.82 351.858 63.22C351.378 65.62 351.138 68.14 351.138 70.78C351.138 73.18 351.408 75.58 351.948 77.98C352.548 80.32 353.478 82.42 354.738 84.28C356.058 86.14 357.738 87.67 359.778 88.87C361.878 90.01 364.428 90.58 367.428 90.58C370.128 90.58 372.438 90.01 374.358 88.87C376.278 87.67 377.838 86.14 379.038 84.28C380.298 82.42 381.198 80.32 381.738 77.98C382.338 75.58 382.638 73.18 382.638 70.78ZM397.238 29.74H402.908V38.83H397.238V29.74ZM397.238 47.56H402.908V94H397.238V47.56ZM413.669 47.56H419.339V55.57H419.519C420.599 52.75 422.519 50.5 425.279 48.82C428.039 47.08 431.069 46.21 434.369 46.21C437.609 46.21 440.309 46.63 442.469 47.47C444.689 48.31 446.459 49.51 447.779 51.07C449.099 52.57 450.029 54.43 450.569 56.65C451.109 58.87 451.379 61.36 451.379 64.12V94H445.709V65.02C445.709 63.04 445.529 61.21 445.169 59.53C444.809 57.79 444.179 56.29 443.279 55.03C442.379 53.77 441.149 52.78 439.589 52.06C438.089 51.34 436.199 50.98 433.919 50.98C431.639 50.98 429.599 51.4 427.799 52.24C426.059 53.02 424.559 54.13 423.299 55.57C422.099 56.95 421.139 58.63 420.419 60.61C419.759 62.53 419.399 64.63 419.339 66.91V94H413.669V47.56ZM501.339 90.22C501.339 93.64 500.949 96.73 500.169 99.49C499.449 102.25 498.279 104.59 496.659 106.51C495.039 108.43 492.909 109.9 490.269 110.92C487.689 111.94 484.509 112.45 480.729 112.45C478.389 112.45 476.109 112.18 473.889 111.64C471.669 111.1 469.659 110.26 467.859 109.12C466.119 107.98 464.649 106.51 463.449 104.71C462.309 102.97 461.649 100.87 461.469 98.41H467.139C467.439 100.15 468.009 101.59 468.849 102.73C469.749 103.93 470.799 104.89 471.999 105.61C473.259 106.33 474.639 106.84 476.139 107.14C477.639 107.5 479.169 107.68 480.729 107.68C486.009 107.68 489.819 106.18 492.159 103.18C494.499 100.18 495.669 95.86 495.669 90.22V83.92H495.489C494.169 86.8 492.219 89.11 489.639 90.85C487.119 92.59 484.149 93.46 480.729 93.46C477.009 93.46 473.829 92.86 471.189 91.66C468.549 90.4 466.359 88.69 464.619 86.53C462.939 84.37 461.709 81.85 460.929 78.97C460.149 76.03 459.759 72.91 459.759 69.61C459.759 66.43 460.209 63.43 461.109 60.61C462.069 57.73 463.419 55.24 465.159 53.14C466.959 50.98 469.149 49.3 471.729 48.1C474.369 46.84 477.369 46.21 480.729 46.21C482.469 46.21 484.089 46.45 485.589 46.93C487.149 47.41 488.559 48.1 489.819 49C491.079 49.84 492.189 50.83 493.149 51.97C494.169 53.11 494.949 54.31 495.489 55.57H495.669V47.56H501.339V90.22ZM480.729 88.69C483.189 88.69 485.349 88.18 487.209 87.16C489.069 86.08 490.629 84.7 491.889 83.02C493.149 81.28 494.079 79.3 494.679 77.08C495.339 74.86 495.669 72.58 495.669 70.24C495.669 67.96 495.399 65.68 494.859 63.4C494.319 61.12 493.449 59.05 492.249 57.19C491.049 55.33 489.489 53.83 487.569 52.69C485.709 51.55 483.429 50.98 480.729 50.98C478.029 50.98 475.719 51.55 473.799 52.69C471.879 53.77 470.289 55.21 469.029 57.01C467.769 58.81 466.839 60.88 466.239 63.22C465.699 65.5 465.429 67.84 465.429 70.24C465.429 72.58 465.729 74.86 466.329 77.08C466.929 79.3 467.859 81.28 469.119 83.02C470.379 84.7 471.969 86.08 473.889 87.16C475.809 88.18 478.089 88.69 480.729 88.69Z" fill="black"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M16.4375 35C16.4375 19.1218 29.3093 6.25 45.1875 6.25H89.75C105.628 6.25 118.5 19.1218 118.5 35V81C118.5 96.8782 105.628 109.75 89.75 109.75H9.25001C7.13691 109.75 5.19407 108.591 4.19024 106.732C3.18642 104.872 3.28337 102.612 4.44273 100.845L13.6093 86.8771C15.4545 84.0654 16.4375 80.7758 16.4375 77.4127V35ZM45.1875 17.75C35.6606 17.75 27.9375 25.4731 27.9375 35V77.4127C27.9375 83.0178 26.2991 88.5005 23.2239 93.1866L19.901 98.25H89.75C99.2769 98.25 107 90.5269 107 81V35C107 25.4731 99.2769 17.75 89.75 17.75H45.1875Z" fill="#00B262"/>
                  <circle cx="54.0928" cy="75.0928" r="12.0928" fill="black"/>
                  <circle cx="78.0928" cy="42.0928" r="11.0928" stroke="black" strokeWidth="2"/>
                </g>
                <defs>
                  <clipPath id="clip0_1013_16">
                    <rect width="534" height="116" fill="white"/>
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
            {isAuthenticated && (
              <SearchButton />
            )}
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