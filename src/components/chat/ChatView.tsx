import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, Send, MoreVertical } from "lucide-react";
import { Chat, Message } from "@/types";
import { mockMessages } from "@/data/mockData";
import { useWallet } from "@/hooks/useWallet";

interface ChatViewProps {
  chat: Chat;
  onMenuClick: () => void;
}

export const ChatView = ({ chat, onMenuClick }: ChatViewProps) => {
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>(
    mockMessages.filter(msg => msg.chatId === chat.id)
  );
  const { currentUser } = useWallet();

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // In real implementation, this would send the message
    console.log("Sending message:", message);
    setMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg: Message) => {
    const isOwnMessage = msg.senderId === currentUser?.id;
    const isSystemMessage = msg.type === 'system' || msg.type === 'trade_action';

    if (isSystemMessage) {
      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
            {msg.content}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwnMessage && (
            <Avatar className="h-8 w-8 mt-1">
              <AvatarImage src={chat.participants.find(p => p.id === msg.senderId)?.avatar} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
          <div className={`
            p-3 rounded-2xl
            ${isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
            }
          `}>
            <p className="text-sm">{msg.content}</p>
            <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {formatTime(msg.timestamp)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={chat.participants[0]?.avatar} />
          <AvatarFallback>
            {chat.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{chat.name}</h2>
            {chat.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {chat.participants.length} participant{chat.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Trade Info */}
      {chat.trade && (
        <div className="p-4 border-b border-border">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Chain</p>
                  <p className="font-medium">{chat.trade.chain}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pair</p>
                  <p className="font-medium">{chat.trade.pair}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{chat.trade.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">{chat.trade.price}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge 
                  className={`capitalize ${chat.trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {chat.trade.type}
                </Badge>
                <Badge 
                  variant="secondary"
                  className={`${
                    chat.trade.status === 'active' ? 'bg-green-100 text-green-800' :
                    chat.trade.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    chat.trade.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {chat.trade.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(renderMessage)}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};