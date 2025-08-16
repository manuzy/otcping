import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

interface ScheduledMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  scheduledFor: Date;
  timezone: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  recurringPattern?: string;
  templateId?: string;
  mentions?: string[];
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export const useScheduledMessages = (chatId?: string) => {
  const { user } = useAuth();
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScheduledMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('scheduled_messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (chatId) {
        query = query.eq('chat_id', chatId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedMessages = data?.map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        content: msg.content,
        scheduledFor: new Date(msg.scheduled_for),
        timezone: msg.timezone,
        status: msg.status as 'pending' | 'sent' | 'cancelled' | 'failed',
        recurringPattern: msg.recurring_pattern,
        templateId: msg.template_id,
        mentions: msg.mentions,
        createdAt: new Date(msg.created_at),
        updatedAt: new Date(msg.updated_at),
        sentAt: msg.sent_at ? new Date(msg.sent_at) : undefined,
      })) || [];

      setScheduledMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      notifications.error({ description: 'Failed to load scheduled messages' });
    } finally {
      setLoading(false);
    }
  }, [user, chatId]);

  const scheduleMessage = async (
    chatId: string,
    content: string,
    scheduledFor: Date,
    options?: {
      timezone?: string;
      recurringPattern?: string;
      templateId?: string;
      mentions?: string[];
    }
  ): Promise<boolean> => {
    if (!user) {
      console.error('User not authenticated for scheduling message');
      notifications.error({ description: 'You must be logged in to schedule messages' });
      return false;
    }

    if (!chatId || !content || !scheduledFor) {
      console.error('Missing required parameters for scheduling message');
      notifications.error({ description: 'Missing required information for scheduling' });
      return false;
    }

    try {
      console.log('Attempting to schedule message:', {
        chatId,
        userId: user.id,
        scheduledFor: scheduledFor.toISOString(),
        timezone: options?.timezone || 'UTC'
      });

      const { error } = await supabase
        .from('scheduled_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
          scheduled_for: scheduledFor.toISOString(),
          timezone: options?.timezone || 'UTC',
          recurring_pattern: options?.recurringPattern || null,
          template_id: options?.templateId || null,
          mentions: options?.mentions || null,
        });

      if (error) {
        console.error('Supabase error scheduling message:', error);
        throw error;
      }

      console.log('Message scheduled successfully');
      notifications.success({ description: 'Message scheduled successfully' });
      await fetchScheduledMessages();
      return true;
    } catch (error: any) {
      console.error('Error scheduling message:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to schedule message';
      if (error?.message?.includes('policy')) {
        errorMessage = 'You do not have permission to schedule messages in this chat';
      } else if (error?.message?.includes('foreign key')) {
        errorMessage = 'Invalid chat or user reference';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      notifications.error({ description: errorMessage });
      return false;
    }
  };

  const cancelScheduledMessage = async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', messageId);

      if (error) throw error;

      notifications.success({ description: 'Scheduled message cancelled' });
      await fetchScheduledMessages();
      return true;
    } catch (error) {
      console.error('Error cancelling scheduled message:', error);
      notifications.error({ description: 'Failed to cancel message' });
      return false;
    }
  };

  const updateScheduledMessage = async (
    messageId: string,
    updates: Partial<Pick<ScheduledMessage, 'content' | 'scheduledFor' | 'recurringPattern'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.content) updateData.content = updates.content;
      if (updates.scheduledFor) updateData.scheduled_for = updates.scheduledFor.toISOString();
      if (updates.recurringPattern !== undefined) updateData.recurring_pattern = updates.recurringPattern;

      const { error } = await supabase
        .from('scheduled_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;

      notifications.success({ description: 'Scheduled message updated' });
      await fetchScheduledMessages();
      return true;
    } catch (error) {
      console.error('Error updating scheduled message:', error);
      notifications.error({ description: 'Failed to update message' });
      return false;
    }
  };

  useEffect(() => {
    fetchScheduledMessages();
  }, [fetchScheduledMessages]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scheduled_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchScheduledMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchScheduledMessages]);

  return {
    scheduledMessages,
    loading,
    scheduleMessage,
    cancelScheduledMessage,
    updateScheduledMessage,
    refetch: fetchScheduledMessages,
  };
};