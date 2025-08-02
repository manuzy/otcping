import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, Send, MoreVertical, Loader2, ExternalLink, Clock, TrendingUp, ShoppingCart } from "lucide-react";
import { Chat, Message } from "@/types";
import { useMessages } from '@/hooks/useMessages';
import { useChatParticipants } from '@/hooks/useChatParticipants';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';
import { useTokens } from '@/hooks/useTokens';
import { useChains } from '@/hooks/useChains';
import { getExplorerUrl } from '@/lib/tokenUtils';
import { safeParseDate, formatNumberWithCommas } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { limitOrderService } from '@/lib/limitOrderService';
import { useWalletClient, useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { useTokenAllowance } from '@/hooks/useTokenAllowance';

interface ChatViewProps {
  chat: Chat;
  onMenuClick: () => void;
}

export const ChatView = ({ chat, onMenuClick }: ChatViewProps) => {
  const [message, setMessage] = useState("");
  const [orderState, setOrderState] = useState<'idle' | 'preparing' | 'signing' | 'submitting'>('idle');
  const { user } = useAuth();
  const { messages, loading: messagesLoading, sending, sendMessage } = useMessages(chat.id);
  const { participants } = useChatParticipants(chat.id);
  const { markAsRead } = useChats();
  const { tokens } = useTokens();
  const { chains } = useChains();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { toast } = useToast();

  // Get sell token for allowance checking
  const sellToken = chat.trade?.sellAsset ? tokens.find(t => t.address.toLowerCase() === chat.trade.sellAsset?.toLowerCase()) : undefined;
  
  // DEBUG: Check what values we're passing to useTokenAllowance
  console.log('🔍 ChatView - useTokenAllowance params:', {
    tokenAddress: sellToken?.address,
    ownerAddress: address,
    spenderAddress: '0x111111125421cA6dc452d289314280a0f8842A65',
    requiredAmount: chat.trade?.size,
    tokenDecimals: 18,
    chainId: chat.trade?.chain_id || 1,
    sellToken,
    tradeData: chat.trade
  });

  // Check token allowance for 1inch limit order contract
  const {
    allowance,
    hasEnoughAllowance,
    isLoading: allowanceLoading,
    isApproving,
    approve
  } = useTokenAllowance({
    tokenAddress: sellToken?.address,
    ownerAddress: address,
    spenderAddress: '0x111111125421cA6dc452d289314280a0f8842A65', // 1inch v6 contract
    requiredAmount: chat.trade?.size,
    tokenDecimals: 18, // TODO: Use actual token decimals
    chainId: chat.trade?.chain_id || 1,
  });

  // Format allowance for display
  const formatAllowance = (allowance: bigint, decimals: number = 18): string => {
    const divisor = 10n ** BigInt(decimals);
    const quotient = allowance / divisor;
    const remainder = allowance % divisor;
    
    if (quotient === 0n && remainder === 0n) return '0';
    if (remainder === 0n) return quotient.toString();
    
    // For non-zero remainder, show up to 4 decimal places
    const decimal = Number(remainder) / Number(divisor);
    const combined = Number(quotient) + decimal;
    return combined.toFixed(4).replace(/\.?0+$/, '');
  };

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

  const handlePlaceOrder = async () => {
    if (!chat.trade || !walletClient || !user) {
      toast({
        title: "Error",
        description: "Missing trade data or wallet connection",
        variant: "destructive",
      });
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
      // Step 1: Preparing order
      setOrderState('preparing');
      toast({
        title: "Preparing Order",
        description: "Setting up your limit order parameters...",
      });

      // Brief delay to show preparing state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Waiting for signature
      setOrderState('signing');
      toast({
        title: "Please Sign Transaction",
        description: isMobile 
          ? "Open your wallet app to sign the limit order transaction"
          : "Check your wallet extension to sign the limit order transaction",
      });

      const orderHash = await limitOrderService.createAndSubmitLimitOrder(
        chat.trade,
        tokens,
        walletClient
      );

      // Step 3: Processing/submitting
      setOrderState('submitting');
      toast({
        title: "Processing Order",
        description: "Submitting your signed order to 1inch protocol...",
      });

      // Brief delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate 1inch app link
      const sellToken = findToken(chat.trade.sellAsset || '');
      const buyToken = findToken(chat.trade.buyAsset || '');
      const appLink = sellToken && buyToken 
        ? limitOrderService.generate1inchAppLink(sellToken.symbol, buyToken.symbol, chat.trade.chain_id || 1)
        : '';

      // Success
      toast({
        title: "Order Placed Successfully",
        description: `Your limit order has been submitted to 1inch. Order hash: ${orderHash?.slice(0, 10) || 'Unknown'}...`,
      });

      // Send a system message to the chat about the order with the app link
      const orderMessage = appLink 
        ? `🎯 Limit order placed on 1inch protocol. Order hash: ${orderHash}\n\n📱 View in 1inch app: ${appLink}`
        : `🎯 Limit order placed on 1inch protocol. Order hash: ${orderHash}`;
      
      await sendMessage(orderMessage);
      
    } catch (error) {
      console.error('Failed to place order:', error);
      
      // Provide specific error messaging based on the error type
      let errorTitle = "Failed to Place Order";
      let errorDescription = "Unknown error occurred";
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          errorTitle = "Transaction Cancelled";
          errorDescription = "You cancelled the transaction in your wallet.";
        } else if (error.message.includes('insufficient')) {
          errorTitle = "Insufficient Balance";
          errorDescription = "You don't have enough tokens or ETH for gas fees.";
        } else {
          errorDescription = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setOrderState('idle');
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

  // Badge color helpers matching PublicTrades
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

    // Helper function to render content with clickable links
    const renderContentWithLinks = (content: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = content.split(urlRegex);
      
      return parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline break-all"
            >
              {part}
            </a>
          );
        }
        return part;
      });
    };

    if (isSystemMessage) {
      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground whitespace-pre-line">
            {renderContentWithLinks(msg.content)}
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
            <div className="text-sm whitespace-pre-line">
              {renderContentWithLinks(msg.content)}
            </div>
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
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
                 <div className="flex-1">
                   <h3 className="text-lg font-semibold">
                     {formatTradePair(chat.trade)} on {chat.trade.chain}
                   </h3>
                 </div>
                <Badge className={getTypeColor(chat.trade.type)}>
                  {chat.trade.type?.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground mb-1">SELL</span>
                  {chat.trade.sellAsset && (() => {
                    const sellToken = findToken(chat.trade.sellAsset);
                    return sellToken ? (
                      <div>
                        <p className="font-semibold">{sellToken.name} ({sellToken.symbol})</p>
                        <a
                          href={getExplorerUrl(chat.trade.chain_id || 1, sellToken.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sellToken.address}
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Unknown Token</p>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground mb-1">BUY</span>
                  {chat.trade.buyAsset && (() => {
                    const buyToken = findToken(chat.trade.buyAsset);
                    return buyToken ? (
                      <div>
                        <p className="font-semibold">{buyToken.name} ({buyToken.symbol})</p>
                        <a
                          href={getExplorerUrl(chat.trade.chain_id || 1, buyToken.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {buyToken.address}
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Unknown Token</p>
                    );
                  })()}
                </div>
              </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-sm">
                 {chat.trade.usdAmount && (
                   <div>
                     <span className="text-xs text-muted-foreground">USD Amount</span>
                     <p className="font-semibold">${formatNumberWithCommas(chat.trade.usdAmount)}</p>
                   </div>
                 )}
                 {chat.trade.limitPrice && (
                   <div>
                     <span className="text-xs text-muted-foreground">Limit Price</span>
                     <p className="font-semibold">{formatNumberWithCommas(chat.trade.limitPrice)}</p>
                   </div>
                 )}
                 <div>
                   <span className="text-xs text-muted-foreground">Status</span>
                   <div>
                     <Badge className={getStatusColor(chat.trade.status)}>
                       {chat.trade.status?.toUpperCase()}
                     </Badge>
                   </div>
                 </div>
               </div>

              <div className="space-y-2 mb-3 text-xs text-muted-foreground">
                {chat.trade.expiryTimestamp && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Expires: {safeParseDate(chat.trade.expiryTimestamp) ? format(safeParseDate(chat.trade.expiryTimestamp)!, "dd/MM/yyyy, HH:mm:ss") : 'Invalid date'}</span>
                  </div>
                )}
                {chat.trade.expectedExecution && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Expected execution: {safeParseDate(chat.trade.expectedExecution) ? format(safeParseDate(chat.trade.expectedExecution)!, "dd/MM/yyyy, HH:mm:ss") : 'Invalid date'}</span>
                  </div>
                )}
                {(chat.trade.triggerAsset || chat.trade.triggerCondition || chat.trade.triggerPrice) && (
                  <div className="flex items-center gap-1">
                    <span>🔔</span>
                    <span>
                      Trigger: {chat.trade.triggerAsset} {chat.trade.triggerCondition} {chat.trade.triggerPrice}
                    </span>
                  </div>
                )}
              </div>
              
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Created {safeParseDate(chat.trade.createdAt) ? formatDistanceToNow(safeParseDate(chat.trade.createdAt)!, { addSuffix: true }) : 'Invalid date'}</span>
                  </div>
                  {user?.id === chat.trade?.createdBy && (
                    <div className="flex gap-2">
                      {/* Show approve button if allowance is insufficient */}
                      {!hasEnoughAllowance && sellToken && (
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approve(chat.trade?.size)}
                            disabled={isApproving || allowanceLoading}
                            className="gap-1"
                          >
                            {isApproving ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-3 w-3" />
                                Approve {sellToken.symbol}
                              </>
                            )}
                          </Button>
                          <div className="text-xs text-muted-foreground">
                            Current: {formatAllowance(allowance)} {sellToken.symbol}
                          </div>
                        </div>
                      )}
                      
                      {/* Place Order button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePlaceOrder}
                        disabled={orderState !== 'idle' || !walletClient || !hasEnoughAllowance || isApproving}
                        className={`gap-1 ${!hasEnoughAllowance ? 'opacity-50' : ''}`}
                      >
                        {orderState === 'preparing' && (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Preparing...
                          </>
                        )}
                        {orderState === 'signing' && (
                          <>
                            <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-500" />
                            Waiting for Signature
                          </>
                        )}
                        {orderState === 'submitting' && (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Submitting...
                          </>
                        )}
                        {orderState === 'idle' && (
                          <>
                            <ShoppingCart className="h-3 w-3" />
                            Place Order
                          </>
                        )}
                      </Button>
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