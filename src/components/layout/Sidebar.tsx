import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreVertical, X } from "lucide-react";
import { Chat } from "@/types";
import { mockChats, currentUser } from "@/data/mockData";
import { WalletConnection } from "../wallet/WalletConnection";

interface SidebarProps {
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onClose: () => void;
}

export const Sidebar = ({ selectedChat, onChatSelect, onClose }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredChats = mockChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>{currentUser.displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">{currentUser.displayName}</h2>
              <p className="text-xs text-muted-foreground truncate">{currentUser.walletAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 md:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Wallet Connection */}
        <WalletConnection />

        {/* Search and New Trade */}
        <div className="space-y-2 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={`
                p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors
                ${selectedChat?.id === chat.id ? 'bg-accent' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.participants[0]?.avatar} />
                    <AvatarFallback>
                      {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {chat.isPublic && (
                    <div className="absolute -top-1 -right-1">
                      <Badge variant="secondary" className="text-xs px-1">Public</Badge>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(chat.lastActivity)}
                    </span>
                  </div>
                  
                  {chat.trade && (
                    <div className="text-xs text-muted-foreground mb-1">
                      {chat.trade.type.toUpperCase()}: {chat.trade.size} at {chat.trade.price}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2 text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};