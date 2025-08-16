import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EnhancedMessage } from '@/types/chat';

export const usePinnedMessages = (chatId: string) => {
  const [pinnedMessages, setPinnedMessages] = useState<EnhancedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPinnedMessages = useCallback(async () => {
    if (!chatId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          messages (
            *,
            profiles:sender_id (
              id,
              display_name,
              avatar
            ),
            message_reactions (
              id,
              emoji,
              user_id,
              created_at
            ),
            message_mentions (
              id,
              mentioned_user_id
            )
          )
        `)
        .eq('chat_id', chatId)
        .order('pinned_at', { ascending: false });

      if (error) {
        console.error('Error fetching pinned messages:', error);
        return;
      }

      const messages = data?.map(item => {
        const message = item.messages;
        return {
          id: message.id,
          chatId: message.chat_id,
          senderId: message.sender_id,
          content: message.content,
          type: message.type,
          timestamp: new Date(message.created_at),
          parentMessageId: message.parent_message_id,
          threadRootId: message.thread_root_id,
          mentions: message.message_mentions?.map(m => m.mentioned_user_id) || [],
          reactions: message.message_reactions?.map(r => ({
            id: r.id,
            messageId: message.id,
            userId: r.user_id,
            emoji: r.emoji,
            createdAt: new Date(r.created_at),
          })) || [],
          senderName: message.profiles?.display_name || 'Unknown User',
          senderAvatar: message.profiles?.avatar,
        };
      }) || [];

      setPinnedMessages(messages);
    } catch (error) {
      console.error('Unexpected error fetching pinned messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const pinMessage = useCallback(async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to pin messages",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from('pinned_messages')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          pinned_by: user.id,
        });

      if (error) {
        console.error('Error pinning message:', error);
        toast({
          title: "Failed to pin message",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Message pinned",
        description: "Message has been pinned to this chat",
      });

      fetchPinnedMessages();
      return true;
    } catch (error) {
      console.error('Unexpected error pinning message:', error);
      toast({
        title: "Failed to pin message",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [chatId, fetchPinnedMessages, toast]);

  const unpinMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('chat_id', chatId)
        .eq('message_id', messageId);

      if (error) {
        console.error('Error unpinning message:', error);
        toast({
          title: "Failed to unpin message",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Message unpinned",
        description: "Message has been unpinned from this chat",
      });

      fetchPinnedMessages();
      return true;
    } catch (error) {
      console.error('Unexpected error unpinning message:', error);
      toast({
        title: "Failed to unpin message",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [chatId, fetchPinnedMessages, toast]);

  const isMessagePinned = useCallback((messageId: string) => {
    return pinnedMessages.some(msg => msg.id === messageId);
  }, [pinnedMessages]);

  useEffect(() => {
    fetchPinnedMessages();
  }, [fetchPinnedMessages]);

  // Set up real-time subscription for pinned messages
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`pinned-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          fetchPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, fetchPinnedMessages]);

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
    refetch: fetchPinnedMessages,
  };
};