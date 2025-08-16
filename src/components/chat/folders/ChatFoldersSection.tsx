import { Chat } from "@/types";
import { useChatFolders } from "@/hooks/useChatFolders";
import { FolderCreateDialog } from "./FolderCreateDialog";
import { FolderItem } from "./FolderItem";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ChatFoldersSectionProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  formatTime: (date: Date) => string;
}

export const ChatFoldersSection = ({ 
  chats, 
  selectedChat, 
  onChatSelect, 
  formatTime 
}: ChatFoldersSectionProps) => {
  const { 
    folders, 
    assignments, 
    loading, 
    assignChatToFolder, 
    removeChatFromFolder 
  } = useChatFolders();

  // Get chats that are not in any folder
  const unassignedChats = chats.filter(chat => 
    !assignments.some(assignment => assignment.chatId === chat.id)
  );

  const handleDrop = async (chatId: string, folderId: string | null) => {
    console.log('Drop event in ChatFoldersSection:', { chatId, folderId });
    
    if (folderId) {
      const success = await assignChatToFolder(chatId, folderId);
      console.log('Assignment result:', success);
    } else {
      const success = await removeChatFromFolder(chatId);
      console.log('Removal result:', success);
    }
  };

  const handleChatDragStart = (e: React.DragEvent, chatId: string) => {
    e.dataTransfer.setData('text/plain', chatId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Folders Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Folders
        </span>
        <FolderCreateDialog />
      </div>

      {/* Folders List */}
      <div className="space-y-1">
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            chats={chats}
            selectedChat={selectedChat}
            onChatSelect={onChatSelect}
            formatTime={formatTime}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Unassigned Chats */}
      {unassignedChats.length > 0 && (
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              All Chats
            </span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              {unassignedChats.length}
            </span>
          </div>
          
          <div className="space-y-1">
            {unassignedChats.map((chat) => (
              <div
                key={chat.id}
                draggable
                onDragStart={(e) => handleChatDragStart(e, chat.id)}
                className="cursor-move"
              >
                <ChatListItem
                  chat={chat}
                  isSelected={selectedChat?.id === chat.id}
                  onSelect={onChatSelect}
                  formatTime={formatTime}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone for Unassigning */}
      {assignments.length > 0 && (
        <div
          className="mx-2 p-3 border-2 border-dashed border-muted rounded-md text-center text-xs text-muted-foreground hover:border-accent transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const chatId = e.dataTransfer.getData('text/plain');
            if (chatId) {
              handleDrop(chatId, null);
            }
          }}
        >
          Drop here to remove from folder
        </div>
      )}
    </div>
  );
};