import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Menu, Send, MoreVertical, Reply, Smile, 
  MessageSquare, Search, Hash, AtSign, Bell, Users, Bookmark, BookmarkCheck
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Chat } from "@/types";
import { useEnhancedMessages } from '@/hooks/useEnhancedMessages';
import { useChatParticipants } from '@/hooks/useChatParticipants';
import { useAuth } from '@/hooks/useAuth';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageStatus } from '@/hooks/useMessageStatus';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { useMessageDrafts } from '@/hooks/useMessageDrafts';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { format } from 'date-fns';
import { EnhancedMessage } from '@/types/chat';
import { MessageThread } from './MessageThread';
import { MessageReactions } from './MessageReactions';
import { MessageActionsMenu } from './MessageActionsMenu';
import { InChatSearch } from '@/components/search/InChatSearch';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { RichMessageInput } from './RichMessageInput';
import { MessageStatusIndicator } from './MessageStatusIndicator';
import { TypingIndicator } from './TypingIndicator';
import { BloombergToolbar } from './BloombergToolbar';
import { useMessageBookmarks } from '@/hooks/useMessageBookmarks';

interface EnhancedChatViewProps {
  chat: Chat;
  onMenuClick: () => void;
}

export const EnhancedChatView = ({ chat, onMenuClick }: EnhancedChatViewProps) => {
  const [message, setMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<EnhancedMessage | null>(null);
  const [showThreads, setShowThreads] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage, addReaction, removeReaction } = useEnhancedMessages(chat.id);
  const { participants } = useChatParticipants(chat.id);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(chat.id);
  const { getMessageStatus, markMessageAsRead } = useMessageStatus(chat.id);
  const { uploadFile, uploading } = useFileUpload();
  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned } = usePinnedMessages(chat.id);
  const { draft, saveDraft, clearDraft } = useMessageDrafts(chat.id);
  const { isUserOnline } = useOnlinePresence();
  const { addBookmark, removeBookmark, isMessageBookmarked } = useMessageBookmarks(chat.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || sending) return false;
    
    try {
      // First send the message
      const result = await sendMessage(
        content.trim(), 
        replyToMessage?.id,
        extractMentions(content)
      );
      
      if (result.success && result.messageId && attachments && attachments.length > 0) {
        console.log('Uploading attachments for message:', result.messageId, attachments);
        
        // Upload each file and associate with the message
        for (const file of attachments) {
          const uploadedFile = await uploadFile(file, chat.id, result.messageId);
          if (!uploadedFile) {
            console.error('Failed to upload file:', file.name);
          }
        }
      }
      
      if (result.success) {
        setReplyToMessage(null);
        stopTyping();
        clearDraft(); // Clear any saved draft
      }
      
      return result.success;
    } catch (error) {
      console.error('Error sending message with attachments:', error);
      return false;
    }
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      // Find user ID by display name
      const user = participants.find(p => 
        p.displayName.toLowerCase().includes(match[1].toLowerCase())
      );
      if (user) mentions.push(user.id);
    }
    return mentions;
  };

  const insertAtMention = (userName: string) => {
    setMessage(prev => prev + `@${userName} `);
  };

  const insertBellAlert = () => {
    setMessage(prev => prev + "🔔 ALERT: ");
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    // Start typing indicator when user starts typing
    if (value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setReplyToMessage(null);
    }
    
    // Bloomberg Terminal keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 't':
          e.preventDefault();
          // Template manager will be opened via toolbar
          break;
        case 's':
          e.preventDefault();
          // Message scheduler will be opened via toolbar
          break;
        case 'b':
          e.preventDefault();
          // Blast composer will be opened via toolbar
          break;
        case 'e':
          e.preventDefault();
          handleExportChat();
          break;
      }
    }
  };

  const handleBookmarkMessage = async (messageId: string) => {
    try {
      const isBookmarked = isMessageBookmarked(messageId);
      if (isBookmarked) {
        await removeBookmark(messageId);
      } else {
        await addBookmark(messageId, chat.id, 'general');
      }
    } catch (error) {
      console.error('Failed to toggle bookmark message:', error);
    }
  };

  const handleExportChat = () => {
    // Create CSV export of chat messages
    const csvContent = messages.map(msg => {
      const sender = participants.find(p => p.id === msg.senderId);
      return `"${msg.timestamp.toISOString()}","${sender?.displayName || 'Unknown'}","${msg.content.replace(/"/g, '""')}"`;
    }).join('\n');
    
    const blob = new Blob([`Date,Sender,Message\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group messages into threads
  const messageThreads = new Map<string, EnhancedMessage[]>();
  const rootMessages: EnhancedMessage[] = [];

  messages.forEach(msg => {
    if (msg.parentMessageId) {
      const rootId = msg.threadRootId || msg.parentMessageId;
      if (!messageThreads.has(rootId)) {
        messageThreads.set(rootId, []);
      }
      messageThreads.get(rootId)!.push(msg);
    } else {
      rootMessages.push(msg);
    }
  });

  const renderMessage = (msg: EnhancedMessage, isInThread = false) => {
    const isOwnMessage = user && msg.senderId === user.id;
    const isSystemMessage = msg.type === 'system' || msg.type === 'trade_action';
    const sender = participants.find(p => p.id === msg.senderId);
    const threadReplies = messageThreads.get(msg.id) || [];
    const hasMentions = msg.mentions && msg.mentions.includes(user?.id || '');

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
      <div key={msg.id} id={`message-${msg.id}`} className="group relative">
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
          <div className={`max-w-[70%] ${hasMentions ? 'ring-2 ring-yellow-400/50' : ''}`}>
            {/* Reply indicator */}
            {msg.parentMessageId && (
              <div className="text-xs text-muted-foreground mb-1 pl-3">
                <Reply className="h-3 w-3 inline mr-1" />
                Replying to message
              </div>
            )}
            
            <div className={`relative
              p-3 rounded-2xl
              ${isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
              }
            `}>
              {/* Sender info for group chats */}
              {!isOwnMessage && !isInThread && (
                <div className="text-xs font-medium mb-1 text-muted-foreground">
                  {sender?.displayName || 'Unknown'}
                </div>
              )}
              
              <div className="text-sm whitespace-pre-wrap">
                {renderContentWithMentions(msg.content)}
              </div>
              
              {/* Reactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <MessageReactions 
                  reactions={msg.reactions} 
                  onToggleReaction={(emoji) => {
                    const userReaction = msg.reactions?.find(r => r.userId === user?.id && r.emoji === emoji);
                    if (userReaction) {
                      removeReaction(msg.id, emoji);
                    } else {
                      addReaction(msg.id, emoji);
                    }
                  }}
                  currentUserId={user?.id}
                />
              )}
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(msg.timestamp, 'HH:mm')}
                  </p>
                  {isOwnMessage && (
                    <MessageStatusIndicator status={getMessageStatus(msg.id)} />
                  )}
                </div>
                
                {/* Thread count */}
                {!isInThread && threadReplies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs"
                    onClick={() => setSelectedThread(selectedThread === msg.id ? null : msg.id)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {threadReplies.length}
                  </Button>
                )}
              </div>
              
              {/* Quick actions - positioned inside message bubble */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className={`flex gap-1 rounded-lg p-1 shadow-sm backdrop-blur-sm ${
                  isOwnMessage 
                    ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
                    : 'bg-background/90 hover:bg-background/95'
                }`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${
                            isOwnMessage 
                              ? 'hover:bg-primary-foreground/20 text-primary-foreground/80 hover:text-primary-foreground' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setReplyToMessage(msg)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reply</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <EmojiPicker onEmojiSelect={(emoji) => addReaction(msg.id, emoji)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 ${
                        isOwnMessage 
                          ? 'hover:bg-primary-foreground/20 text-primary-foreground/80 hover:text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Smile className="h-3 w-3" />
                    </Button>
                  </EmojiPicker>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${
                            isOwnMessage 
                              ? 'hover:bg-primary-foreground/20 text-primary-foreground/80 hover:text-primary-foreground' 
                              : 'hover:bg-muted'
                          } ${
                            isMessageBookmarked(msg.id) ? 'text-yellow-500 hover:text-yellow-600' : ''
                          }`}
                          onClick={() => handleBookmarkMessage(msg.id)}
                        >
                          {isMessageBookmarked(msg.id) ? (
                            <BookmarkCheck className="h-3 w-3" />
                          ) : (
                            <Bookmark className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isMessageBookmarked(msg.id) ? 'Remove bookmark' : 'Bookmark'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <MessageActionsMenu
                    message={msg}
                    onReply={setReplyToMessage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show thread if selected */}
        {!isInThread && selectedThread === msg.id && threadReplies.length > 0 && (
          <MessageThread
            rootMessage={msg}
            replies={threadReplies}
            participants={participants}
            currentUser={user}
            onSendReply={async (content) => {
              const result = await sendMessage(content, msg.id);
              return result.success;
            }}
          />
        )}
      </div>
    );
  };

  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <span key={index} className="bg-blue-500/20 text-blue-400 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  // For direct messages, get the other participant for display
  const isDirectMessage = participants.length === 2 && !chat.isPublic;
  const otherParticipant = isDirectMessage ? participants.find(p => p.id !== user?.id) : null;
  const displayName = isDirectMessage && otherParticipant ? otherParticipant.displayName : chat.name;
  const displayAvatar = isDirectMessage && otherParticipant ? otherParticipant.avatar : undefined;

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
            {isDirectMessage && otherParticipant && (
              <div className={`w-2 h-2 rounded-full ${
                isUserOnline(otherParticipant.id) ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isDirectMessage 
              ? (isUserOnline(otherParticipant?.id || '') ? 'Online' : 'Offline')
              : `${participants.length} participant${participants.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowThreads(!showThreads)}
            className={showThreads ? 'bg-muted' : ''}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className={showInChatSearch ? 'bg-muted' : ''}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Users className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* In-Chat Search */}
      <InChatSearch
        messages={messages}
        isOpen={showInChatSearch}
        onClose={() => setShowInChatSearch(false)}
        onMessageNavigate={(messageId) => {
          // Scroll to message with ID
          const element = document.getElementById(`message-${messageId}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Bloomberg Terminal Toolbar */}
      <BloombergToolbar 
        chatId={chat.id}
        onBookmark={() => {}}
        onExport={handleExportChat}
        onShortcuts={() => {}}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {rootMessages.map(msg => renderMessage(msg))}
            <div ref={messagesEndRef} />
          </>
        )}
        
        {/* Typing indicator */}
        <TypingIndicator typingUserIds={typingUsers} chatId={chat.id} />
      </div>

      {/* Rich Message Input */}
      <div className="p-4 border-t border-border">
        <RichMessageInput
          value={message}
          onChange={handleMessageChange}
          onSend={handleSendMessage}
          onKeyDown={handleKeyDown}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          disabled={sending}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
};