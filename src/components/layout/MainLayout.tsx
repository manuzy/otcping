import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { EnhancedChatView } from "../chat/EnhancedChatView";
import { WelcomeView } from "../chat/WelcomeView";
import { Chat } from "@/types";
import { useChats } from "@/hooks/useChats";

export const MainLayout = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { chats, loading } = useChats();

  // Handle URL chat parameter
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && chats.length > 0 && !loading) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
      } else {
        // Invalid chat ID, remove from URL
        setSearchParams(params => {
          params.delete('chat');
          return params;
        });
      }
    }
  }, [searchParams, chats, loading, setSearchParams]);

  // Update URL when chat selection changes
  const handleChatSelect = (chat: Chat | null) => {
    setSelectedChat(chat);
    if (chat) {
      setSearchParams(params => {
        params.set('chat', chat.id);
        return params;
      });
    } else {
      setSearchParams(params => {
        params.delete('chat');
        return params;
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 bg-card border-r border-border">
        <Sidebar 
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        md:hidden fixed inset-y-16 left-0 z-overlay w-80 
        bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-overlay-light z-fixed"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <EnhancedChatView 
            chat={selectedChat}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        ) : (
          <WelcomeView onMenuClick={() => setIsSidebarOpen(true)} />
        )}
      </div>
    </div>
  );
};