import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { EnhancedMessage, MessageReaction } from '@/types/chat';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export const useEnhancedMessages = (chatId: string) => {
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, display_name, avatar),
          reactions:message_reactions(*),
          mentions:message_mentions(mentioned_user_id)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const enhancedMessages: EnhancedMessage[] = data.map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        content: msg.content,
        type: msg.type,
        timestamp: new Date(msg.created_at),
        parentMessageId: msg.parent_message_id,
        threadRootId: msg.thread_root_id,
        mentions: msg.mentions?.map((m: any) => m.mentioned_user_id) || [],
        reactions: msg.reactions?.map((r: any) => ({
          id: r.id,
          messageId: r.message_id,
          userId: r.user_id,
          emoji: r.emoji,
          createdAt: new Date(r.created_at)
        })) || [],
        attachments: [] // TODO: Implement attachments
      }));

      setMessages(enhancedMessages);
    } catch (error) {
      logger.error('Failed to fetch enhanced messages', { chatId }, error as Error);
      notifications.error({ description: 'Failed to load messages' });
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const sendMessage = useCallback(async (
    content: string, 
    parentMessageId?: string,
    mentions?: string[]
  ): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    setSending(true);
    
    try {
      // Extract @mentions from content
      const mentionRegex = /@(\w+)/g;
      const extractedMentions = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        extractedMentions.push(match[1]);
      }

      const allMentions = [...(mentions || []), ...extractedMentions];

      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: content.trim(),
          type: 'message',
          parent_message_id: parentMessageId,
          thread_root_id: parentMessageId ? await getThreadRootId(parentMessageId) : null
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Insert mentions if any
      if (allMentions.length > 0) {
        const mentionData = allMentions.map(mention => ({
          message_id: messageData.id,
          mentioned_user_id: mention
        }));

        await supabase.from('message_mentions').insert(mentionData);
      }

      // Send notifications to other participants
      await supabase.functions.invoke('send-message-notification', {
        body: { 
          messageId: messageData.id,
          chatId,
          senderId: user.id,
          content: content.trim(),
          mentions: allMentions
        }
      });

      // Refresh messages
      await fetchMessages();
      
      return true;
    } catch (error) {
      logger.error('Failed to send enhanced message', { chatId }, error as Error);
      notifications.error({ description: 'Failed to send message' });
      return false;
    } finally {
      setSending(false);
    }
  }, [user, chatId, fetchMessages]);

  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) throw error;
      
      await fetchMessages();
      return true;
    } catch (error) {
      logger.error('Failed to add reaction', { messageId, emoji }, error as Error);
      return false;
    }
  }, [user, fetchMessages]);

  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
      
      await fetchMessages();
      return true;
    } catch (error) {
      logger.error('Failed to remove reaction', { messageId, emoji }, error as Error);
      return false;
    }
  }, [user, fetchMessages]);

  const getThreadRootId = async (messageId: string): Promise<string> => {
    const { data } = await supabase
      .from('messages')
      .select('thread_root_id, parent_message_id')
      .eq('id', messageId)
      .single();
    
    return data?.thread_root_id || data?.parent_message_id || messageId;
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`enhanced-messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        () => {
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, fetchMessages]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    addReaction,
    removeReaction,
    refetch: fetchMessages
  };
};