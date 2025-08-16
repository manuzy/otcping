import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, FolderOpen } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Chat } from "@/types";
import { useChats } from '@/hooks/useChats';
import { useAppKitAccount } from '@reown/appkit/react';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { ChatFoldersSection } from '@/components/chat/folders/ChatFoldersSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SidebarProps {
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onClose: () => void;
}

export const Sidebar = ({ selectedChat, onChatSelect, onClose }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("folders");
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-2 mb-2">
            <TabsTrigger value="folders" className="text-xs">
              <FolderOpen className="h-3 w-3 mr-1" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All Chats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="folders" className="flex-1 overflow-y-auto mt-0">
            <div className="px-2">
              <ChatFoldersSection
                chats={filteredChats}
                selectedChat={selectedChat}
                onChatSelect={onChatSelect}
                formatTime={formatTime}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <LoadingSpinner size="md" />
                  <span>Loading chats...</span>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};