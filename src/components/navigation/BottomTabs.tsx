import { MessageCircle, TrendingUp, Users, UserPlus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAppKitAccount } from '@reown/appkit/react';
import { cn } from "@/lib/utils";

const tabs = [
  { id: 'chats', label: 'Chats', icon: MessageCircle, path: '/' },
  { id: 'public-chats', label: 'Markets', icon: TrendingUp, path: '/public-chats' },
  { id: 'users', label: 'Traders', icon: Users, path: '/users' },
  { id: 'contacts', label: 'Contacts', icon: UserPlus, path: '/contacts' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export const BottomTabs = () => {
  const { isConnected } = useAppKitAccount();

  // Only show bottom tabs if wallet is connected
  if (!isConnected) {
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