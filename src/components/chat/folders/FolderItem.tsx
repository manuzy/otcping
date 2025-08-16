import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChatFolder } from "@/types/chat";
import { Chat } from "@/types";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { useChatFolders } from "@/hooks/useChatFolders";
import { FolderRenameDialog } from "./FolderRenameDialog";
import { cn } from "@/lib/utils";

interface FolderItemProps {
  folder: ChatFolder;
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  formatTime: (date: Date) => string;
  onDrop: (chatId: string, folderId: string | null) => void;
}

export const FolderItem = ({ 
  folder, 
  chats, 
  selectedChat, 
  onChatSelect, 
  formatTime,
  onDrop 
}: FolderItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { deleteFolder, assignments } = useChatFolders();

  // Get chats in this folder
  const folderChats = chats.filter(chat => 
    assignments.some(assignment => 
      assignment.chatId === chat.id && assignment.folderId === folder.id
    )
  );

  const handleDelete = async () => {
    if (window.confirm(`Delete folder "${folder.name}"? Chats will be moved to the main list.`)) {
      await deleteFolder(folder.id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const chatId = e.dataTransfer.getData('text/plain');
    if (chatId) {
      onDrop(chatId, folder.id);
    }
  };

  return (
    <div className="space-y-1">
      {/* Folder Header */}
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md group hover:bg-accent/50 transition-colors",
          isDragOver && "bg-accent"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
        
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0 border border-border/20"
          style={{ backgroundColor: folder.color }}
        />
        
        <span className="text-sm font-medium text-foreground/90 flex-1 truncate">
          {folder.name}
        </span>
        
        {folderChats.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
            {folderChats.length}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename Folder
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder Chats */}
      {isExpanded && (
        <div className="ml-6 space-y-1">
          {folderChats.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">
              No chats in this folder
            </div>
          ) : (
            folderChats.map((chat) => (
              <div
                key={chat.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', chat.id);
                }}
                className="cursor-move"
              >
                <ChatListItem
                  chat={chat}
                  isSelected={selectedChat?.id === chat.id}
                  onSelect={onChatSelect}
                  formatTime={formatTime}
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Rename Dialog */}
      <FolderRenameDialog
        folder={folder}
        open={isRenaming}
        onClose={() => setIsRenaming(false)}
      />
    </div>
  );
};