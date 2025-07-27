import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { Chat } from "@/types";
import { useChats } from '@/hooks/useChats';
import { useAppKitAccount } from '@reown/appkit/react';
import { ChatListItem } from '@/components/chat/ChatListItem';

interface SidebarProps {
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onClose: () => void;
}

export const Sidebar = ({ selectedChat, onChatSelect, onClose }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { address, isConnected } = useAppKitAccount();
  const { chats, loading } = useChats();
  const navigate = useNavigate();
  
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't render sidebar if wallet not connected
  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0 bg-background">
        <div className="flex items-center justify-end mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 md:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

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
          <Button className="w-full" size="sm" onClick={() => navigate("/create-trade")}>
            <Plus className="h-4 w-4 mr-2" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading chats...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {chats.length === 0 ? 'No chats yet' : 'No chats match your search'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatListItem 
                key={chat.id}
                chat={chat}
                isSelected={selectedChat?.id === chat.id}
                onSelect={onChatSelect}
                formatTime={formatTime}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};