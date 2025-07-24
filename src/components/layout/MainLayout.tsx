import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ChatView } from "../chat/ChatView";
import { WelcomeView } from "../chat/WelcomeView";
import { Chat } from "@/types";

export const MainLayout = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative
        fixed inset-y-0 left-0 z-50
        w-80 bg-card border-r border-border
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar 
          selectedChat={selectedChat}
          onChatSelect={setSelectedChat}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatView 
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