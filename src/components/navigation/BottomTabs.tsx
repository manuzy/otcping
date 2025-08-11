import { MessageCircle, TrendingUp, Users, UserPlus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'chats', label: 'Chats', icon: MessageCircle, path: '/app/dashboard' },
  { id: 'public-trades', label: 'Markets', icon: TrendingUp, path: '/app/trades' },
  { id: 'users', label: 'Traders', icon: Users, path: '/app/traders' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/app/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
];

export const BottomTabs = () => {
  const { isAuthenticated } = useWalletAuth();

  // Only show bottom tabs if user is fully authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs",
                  "transition-colors duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="truncate">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};