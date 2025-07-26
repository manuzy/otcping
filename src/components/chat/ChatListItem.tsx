import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Chat } from "@/types";
import { useChatParticipants } from '@/hooks/useChatParticipants';
import { useAuth } from '@/hooks/useAuth';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chat: Chat) => void;
  formatTime: (date: Date) => string;
}

export const ChatListItem = ({ chat, isSelected, onSelect, formatTime }: ChatListItemProps) => {
  const { user } = useAuth();
  const { participants } = useChatParticipants(chat.id);
  
  // For direct messages, get the other participant for display
  const isDirectMessage = participants.length === 2 && !chat.isPublic;
  const otherParticipant = isDirectMessage ? participants.find(p => p.id !== user?.id) : null;
  const displayName = isDirectMessage && otherParticipant ? otherParticipant.displayName : chat.name;
  const displayAvatar = isDirectMessage && otherParticipant ? otherParticipant.avatar : undefined;

  return (
    <div
      onClick={() => onSelect(chat)}
      className={`
        p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors
        ${isSelected ? 'bg-accent' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback>
              {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
            <h3 className="font-medium text-sm truncate">{displayName}</h3>
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
  );
};