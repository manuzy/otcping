import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageReaction } from "@/types/chat";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onToggleReaction: (emoji: string) => void;
  currentUserId?: string;
}

export const MessageReactions = ({ 
  reactions, 
  onToggleReaction, 
  currentUserId 
}: MessageReactionsProps) => {
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const count = reactionList.length;
        const hasUserReacted = currentUserId && reactionList.some(r => r.userId === currentUserId);
        
        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasUserReacted ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onToggleReaction(emoji)}
                >
                  <span className="mr-1">{emoji}</span>
                  <span>{count}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {reactionList.map(r => r.userId).join(', ')} reacted with {emoji}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};