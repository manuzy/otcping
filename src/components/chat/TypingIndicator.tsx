import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatParticipants } from "@/hooks/useChatParticipants";

interface TypingIndicatorProps {
  typingUserIds: string[];
  chatId: string;
}

export const TypingIndicator = ({ typingUserIds, chatId }: TypingIndicatorProps) => {
  const { participants } = useChatParticipants(chatId);
  
  if (typingUserIds.length === 0) return null;

  const typingUsers = participants.filter(p => typingUserIds.includes(p.id));
  
  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex -space-x-1">
        {typingUsers.slice(0, 3).map(user => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-xs">
              {user.displayName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <span className="flex items-center gap-1">
        {getTypingText()}
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-100" />
          <div className="w-1 h-1 bg-current rounded-full animate-pulse delay-200" />
        </div>
      </span>
    </div>
  );
};