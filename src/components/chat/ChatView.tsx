import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, Send, MoreVertical, Loader2, ExternalLink } from "lucide-react";
import { Chat, Message } from "@/types";
import { useMessages } from '@/hooks/useMessages';
import { useChatParticipants } from '@/hooks/useChatParticipants';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';
import { useTokens } from '@/hooks/useTokens';
import { useChains } from '@/hooks/useChains';
import { getExplorerUrl, truncateAddress } from '@/lib/tokenUtils';
import { safeParseDate } from '@/lib/utils';

interface ChatViewProps {
  chat: Chat;
  onMenuClick: () => void;
}

export const ChatView = ({ chat, onMenuClick }: ChatViewProps) => {
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { messages, loading: messagesLoading, sending, sendMessage } = useMessages(chat.id);
  const { participants } = useChatParticipants(chat.id);
  const { markAsRead } = useChats();
  const { tokens } = useTokens();
  const { chains } = useChains();

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (chat.id && user && chat.unreadCount > 0) {
      markAsRead(chat.id);
    }
  }, [chat.id, user?.id, chat.unreadCount, markAsRead]);

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;
    
    const success = await sendMessage(message.trim());
    if (success) {
      setMessage("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper functions for trade data
  const findToken = (address: string) => {
    if (!address || !tokens) return null;
    return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
  };

  const formatTradePair = (trade: any) => {
    const sellToken = findToken(trade.sellAsset || '');
    const buyToken = findToken(trade.buyAsset || '');
    
    if (sellToken && buyToken) {
      return `${sellToken.symbol}/${buyToken.symbol}`;
    }
    return trade.pair || 'Unknown Pair';
  };

  // DEBUG: Log all relevant data
  console.log('🔍 ChatView Debug:', {
    chatId: chat.id,
    chatName: chat.name,
    chatIsPublic: chat.isPublic,
    currentUserId: user?.id,
    currentUserMetadata: user?.user_metadata,
    participantsCount: participants.length,
    participants: participants.map(p => ({ id: p.id, displayName: p.displayName, avatar: p.avatar }))
  });

  // For direct messages, get the other participant for display
  const isDirectMessage = participants.length === 2 && !chat.isPublic;
  const otherParticipant = isDirectMessage ? participants.find(p => p.id !== user?.id) : null;
  const displayName = isDirectMessage && otherParticipant ? otherParticipant.displayName : chat.name;
  const displayAvatar = isDirectMessage && otherParticipant ? otherParticipant.avatar : undefined;
  
  // DEBUG: Log computed values
  console.log('📊 ChatView Computed:', {
    chatId: chat.id,
    isDirectMessage,
    otherParticipant: otherParticipant ? { id: otherParticipant.id, displayName: otherParticipant.displayName, avatar: otherParticipant.avatar } : null,
    displayName,
    displayAvatar
  });

  const renderMessage = (msg: Message) => {
    const isOwnMessage = user && msg.senderId === user.id;
    const isSystemMessage = msg.type === 'system' || msg.type === 'trade_action';
    const sender = participants.find(p => p.id === msg.senderId);

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
        <div className={`max-w-[70%]`}>
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
          <AvatarImage src={displayAvatar} />
          <AvatarFallback>
            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{displayName}</h2>
            {chat.isPublic && <Badge variant="secondary" className="text-xs">Public</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
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
              <div className="space-y-4">
                {/* Trade Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{formatTradePair(chat.trade)}</h3>
                    <p className="text-sm text-muted-foreground">{chat.trade.chain}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge 
                      className={chat.trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {chat.trade.type.toUpperCase()}
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
                </div>

                {/* Token Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sell Token */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Sell Token</p>
                    {chat.trade.sellAsset && (() => {
                      const sellToken = findToken(chat.trade.sellAsset);
                      if (sellToken) {
                        return (
                          <div className="space-y-1">
                            <p className="font-medium">{sellToken.name} ({sellToken.symbol})</p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {truncateAddress(sellToken.address)}
                              </code>
                              {chat.trade.chain_id && (
                                <a
                                  href={getExplorerUrl(chat.trade.chain_id, sellToken.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-sm text-muted-foreground">Token not found</p>;
                    })()}
                  </div>

                  {/* Buy Token */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Buy Token</p>
                    {chat.trade.buyAsset && (() => {
                      const buyToken = findToken(chat.trade.buyAsset);
                      if (buyToken) {
                        return (
                          <div className="space-y-1">
                            <p className="font-medium">{buyToken.name} ({buyToken.symbol})</p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {truncateAddress(buyToken.address)}
                              </code>
                              {chat.trade.chain_id && (
                                <a
                                  href={getExplorerUrl(chat.trade.chain_id, buyToken.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-sm text-muted-foreground">Token not found</p>;
                    })()}
                  </div>
                </div>

                {/* Trade Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {chat.trade.usdAmount && (
                    <div>
                      <p className="text-muted-foreground">USD Amount</p>
                      <p className="font-medium">${chat.trade.usdAmount}</p>
                    </div>
                  )}
                  {chat.trade.limitPrice && (
                    <div>
                      <p className="text-muted-foreground">Limit Price</p>
                      <p className="font-medium">{chat.trade.limitPrice}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{chat.trade.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium">{chat.trade.price}</p>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {chat.trade.expiryTimestamp && (
                    <div>
                      <p className="text-muted-foreground">Expiry</p>
                      <p className="font-medium">
                        {safeParseDate(chat.trade.expiryTimestamp)?.toLocaleDateString() || 'Invalid date'}
                      </p>
                    </div>
                  )}
                  {chat.trade.expectedExecution && (
                    <div>
                      <p className="text-muted-foreground">Expected Execution</p>
                      <p className="font-medium">
                        {safeParseDate(chat.trade.expectedExecution)?.toLocaleDateString() || 'Invalid date'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {safeParseDate(chat.trade.createdAt)?.toLocaleDateString() || 'Invalid date'}
                    </p>
                  </div>
                </div>

                {/* Trigger Conditions */}
                {(chat.trade.triggerAsset || chat.trade.triggerCondition || chat.trade.triggerPrice) && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Trigger Conditions</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {chat.trade.triggerAsset && (
                        <div>
                          <p className="text-muted-foreground">Trigger Asset</p>
                          <p className="font-medium">{chat.trade.triggerAsset}</p>
                        </div>
                      )}
                      {chat.trade.triggerCondition && (
                        <div>
                          <p className="text-muted-foreground">Condition</p>
                          <p className="font-medium">{chat.trade.triggerCondition}</p>
                        </div>
                      )}
                      {chat.trade.triggerPrice && (
                        <div>
                          <p className="text-muted-foreground">Trigger Price</p>
                          <p className="font-medium">{chat.trade.triggerPrice}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(renderMessage)
        )}
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 md:bottom-0 bg-background p-4 border-t border-border pb-20 md:pb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};