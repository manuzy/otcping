import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Send, X } from "lucide-react";
import { format } from "date-fns";
import { EnhancedMessage } from "@/types/chat";
import { User } from "@/types";

interface MessageThreadProps {
  rootMessage: EnhancedMessage;
  replies: EnhancedMessage[];
  participants: User[];
  currentUser: any;
  onSendReply: (content: string) => Promise<boolean>;
}

export const MessageThread = ({ 
  rootMessage, 
  replies, 
  participants, 
  currentUser, 
  onSendReply 
}: MessageThreadProps) => {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    
    setSending(true);
    const success = await onSendReply(replyText.trim());
    if (success) {
      setReplyText("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const renderThreadMessage = (msg: EnhancedMessage) => {
    const isOwnMessage = currentUser && msg.senderId === currentUser.id;
    const sender = participants.find(p => p.id === msg.senderId);

    return (
      <div key={msg.id} className="flex gap-3 mb-3">
        <Avatar className="h-6 w-6 mt-1">
          <AvatarImage src={sender?.avatar} />
          <AvatarFallback className="text-xs">
            {sender?.displayName.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{sender?.displayName}</span>
            <span className="text-xs text-muted-foreground">
              {format(msg.timestamp, 'HH:mm')}
            </span>
          </div>
          
          <div className={`
            text-sm p-2 rounded-lg max-w-fit
            ${isOwnMessage 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted'
            }
          `}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="ml-8 mt-2 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            Thread ({replies.length} repl{replies.length === 1 ? 'y' : 'ies'})
          </h4>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Thread messages */}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
          {replies.map(reply => renderThreadMessage(reply))}
        </div>
        
        {/* Reply input */}
        <div className="flex gap-2">
          <Input
            placeholder="Reply to thread..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="text-sm"
          />
          <Button 
            size="sm"
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};