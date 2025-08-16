import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, Reply, Forward, Copy, Edit, Trash2, 
  Pin, MessageSquare, Bookmark
} from "lucide-react";
import { EnhancedMessage } from "@/types/chat";
import { useAuth } from "@/hooks/useAuth";

interface MessageActionsMenuProps {
  message: EnhancedMessage;
  onReply: (message: EnhancedMessage) => void;
  onEdit?: (message: EnhancedMessage) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: EnhancedMessage) => void;
  onPin?: (messageId: string) => void;
  onThread?: (message: EnhancedMessage) => void;
  onBookmark?: (messageId: string) => void;
}

export const MessageActionsMenu = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onPin,
  onThread,
  onBookmark
}: MessageActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  
  const isOwnMessage = user && message.senderId === user.id;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => { onReply(message); setOpen(false); }}>
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </DropdownMenuItem>
        
        {onThread && (
          <DropdownMenuItem onClick={() => { onThread(message); setOpen(false); }}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Thread
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={handleCopyMessage}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Text
        </DropdownMenuItem>
        
        {onForward && (
          <DropdownMenuItem onClick={() => { onForward(message); setOpen(false); }}>
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </DropdownMenuItem>
        )}
        
        {onBookmark && (
          <DropdownMenuItem onClick={() => { onBookmark(message.id); setOpen(false); }}>
            <Bookmark className="h-4 w-4 mr-2" />
            Bookmark
          </DropdownMenuItem>
        )}
        
        {onPin && (
          <DropdownMenuItem onClick={() => { onPin(message.id); setOpen(false); }}>
            <Pin className="h-4 w-4 mr-2" />
            Pin Message
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {isOwnMessage && onEdit && (
          <DropdownMenuItem onClick={() => { onEdit(message); setOpen(false); }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}
        
        {isOwnMessage && onDelete && (
          <DropdownMenuItem 
            onClick={() => { onDelete(message.id); setOpen(false); }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};