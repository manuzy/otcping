import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageStatusData {
  messageId: string;
  status: MessageStatus;
  timestamp: Date;
  userId?: string;
}

export const useMessageStatus = (chatId: string) => {
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatusData>>(new Map());
  const { user } = useAuth();

  const updateMessageStatus = useCallback(async (
    messageId: string, 
    status: MessageStatus,
    targetUserId?: string
  ) => {
    if (!user) return;

    try {
      // Update local state immediately
      setMessageStatuses(prev => new Map(prev.set(messageId, {
        messageId,
        status,
        timestamp: new Date(),
        userId: targetUserId || user.id
      })));

      // Save to database for persistence
      const { error } = await supabase
        .from('message_status')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          status,
        });

      if (error) {
        console.error('Error persisting message status:', error);
      }

      // Broadcast status update to other users
      const channel = supabase.channel(`message-status:${chatId}`);
      channel.subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'status_update',
            payload: {
              messageId,
              status,
              userId: user.id,
              timestamp: new Date().toISOString()
            }
          });
        }
      });

      // Clean up channel after broadcasting
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 1000);

    } catch (error) {
      console.error('Failed to update message status:', error);
    }
  }, [user, chatId]);

  const markMessageAsRead = useCallback((messageId: string) => {
    updateMessageStatus(messageId, 'read');
  }, [updateMessageStatus]);

  const markMessageAsDelivered = useCallback((messageId: string) => {
    updateMessageStatus(messageId, 'delivered');
  }, [updateMessageStatus]);

  // Listen for status updates from other users
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`message-status-listener:${chatId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        const { messageId, status, userId, timestamp } = payload.payload;
        
        // Don't update our own message statuses from broadcasts
        if (userId !== user.id) {
          setMessageStatuses(prev => new Map(prev.set(messageId, {
            messageId,
            status,
            timestamp: new Date(timestamp),
            userId
          })));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  const getMessageStatus = useCallback((messageId: string): MessageStatus => {
    const status = messageStatuses.get(messageId);
    return status?.status || 'sent';
  }, [messageStatuses]);

  return {
    updateMessageStatus,
    markMessageAsRead,
    markMessageAsDelivered,
    getMessageStatus,
    messageStatuses: Object.fromEntries(messageStatuses)
  };
};