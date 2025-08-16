import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface MessagePriority {
  id: string;
  messageId: string;
  priorityLevel: PriorityLevel;
  requiresAcknowledgment: boolean;
  deadline?: Date;
  createdAt: Date;
}

export const useMessagePriorities = (chatId?: string) => {
  const { user } = useAuth();
  const [priorities, setPriorities] = useState<MessagePriority[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPriorities = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('message_priorities')
        .select(`
          id,
          message_id,
          priority_level,
          requires_acknowledgment,
          deadline,
          created_at
        `);

      if (chatId) {
        // Join with messages to filter by chat
        query = supabase
          .from('message_priorities')
          .select(`
            id,
            message_id,
            priority_level,
            requires_acknowledgment,
            deadline,
            created_at,
            messages!inner(chat_id)
          `)
          .eq('messages.chat_id', chatId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPriorities = data?.map(priority => ({
        id: priority.id,
        messageId: priority.message_id,
        priorityLevel: priority.priority_level as PriorityLevel,
        requiresAcknowledgment: priority.requires_acknowledgment || false,
        deadline: priority.deadline ? new Date(priority.deadline) : undefined,
        createdAt: new Date(priority.created_at),
      })) || [];

      setPriorities(transformedPriorities);
    } catch (error) {
      console.error('Error fetching message priorities:', error);
      notifications.error({ description: 'Failed to load message priorities' });
    } finally {
      setLoading(false);
    }
  }, [user, chatId]);

  const setPriority = async (
    messageId: string,
    priorityLevel: PriorityLevel,
    options?: {
      requiresAcknowledgment?: boolean;
      deadline?: Date;
    }
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_priorities')
        .upsert({
          message_id: messageId,
          priority_level: priorityLevel,
          requires_acknowledgment: options?.requiresAcknowledgment || false,
          deadline: options?.deadline?.toISOString(),
        }, {
          onConflict: 'message_id'
        });

      if (error) throw error;

      notifications.success({ description: 'Message priority set' });
      await fetchPriorities();
      return true;
    } catch (error) {
      console.error('Error setting message priority:', error);
      notifications.error({ description: 'Failed to set message priority' });
      return false;
    }
  };

  const removePriority = async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_priorities')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;

      notifications.success({ description: 'Message priority removed' });
      await fetchPriorities();
      return true;
    } catch (error) {
      console.error('Error removing message priority:', error);
      notifications.error({ description: 'Failed to remove message priority' });
      return false;
    }
  };

  const getMessagePriority = (messageId: string): MessagePriority | undefined => {
    return priorities.find(p => p.messageId === messageId);
  };

  const getOverduePriorities = (): MessagePriority[] => {
    const now = new Date();
    return priorities.filter(p => 
      p.deadline && 
      p.deadline < now && 
      p.requiresAcknowledgment
    );
  };

  const getPrioritiesByLevel = (level: PriorityLevel): MessagePriority[] => {
    return priorities.filter(p => p.priorityLevel === level);
  };

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('priorities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_priorities',
        },
        () => {
          fetchPriorities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPriorities]);

  return {
    priorities,
    loading,
    setPriority,
    removePriority,
    getMessagePriority,
    getOverduePriorities,
    getPrioritiesByLevel,
    refetch: fetchPriorities,
  };
};