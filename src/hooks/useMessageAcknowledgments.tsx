import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

export interface MessageAcknowledgment {
  id: string;
  messageId: string;
  userId: string;
  acknowledgedAt: Date;
  notes?: string;
  userDisplayName?: string;
}

export const useMessageAcknowledgments = (messageId?: string) => {
  const { user } = useAuth();
  const [acknowledgments, setAcknowledgments] = useState<MessageAcknowledgment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAcknowledgments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('message_acknowledgments')
        .select(`
          id,
          message_id,
          user_id,
          acknowledged_at,
          notes
        `);

      if (messageId) {
        query = query.eq('message_id', messageId);
      }

      const { data, error } = await query.order('acknowledged_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setAcknowledgments([]);
        return;
      }

      // Get user display names
      const userIds = [...new Set(data.map(ack => ack.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      const transformedAcknowledgments = data.map(ack => ({
        id: ack.id,
        messageId: ack.message_id,
        userId: ack.user_id,
        acknowledgedAt: new Date(ack.acknowledged_at),
        notes: ack.notes,
        userDisplayName: profileMap.get(ack.user_id) || 'Unknown User',
      }));

      setAcknowledgments(transformedAcknowledgments);
    } catch (error) {
      console.error('Error fetching acknowledgments:', error);
      notifications.error({ description: 'Failed to load acknowledgments' });
    } finally {
      setLoading(false);
    }
  }, [user, messageId]);

  const acknowledgeMessage = async (
    messageId: string,
    notes?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_acknowledgments')
        .insert({
          message_id: messageId,
          user_id: user.id,
          notes,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          notifications.info({ description: 'Message already acknowledged' });
          return false;
        }
        throw error;
      }

      notifications.success({ description: 'Message acknowledged' });
      await fetchAcknowledgments();
      return true;
    } catch (error) {
      console.error('Error acknowledging message:', error);
      notifications.error({ description: 'Failed to acknowledge message' });
      return false;
    }
  };

  const updateAcknowledgment = async (
    acknowledgmentId: string,
    notes: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_acknowledgments')
        .update({ notes })
        .eq('id', acknowledgmentId);

      if (error) throw error;

      notifications.success({ description: 'Acknowledgment updated' });
      await fetchAcknowledgments();
      return true;
    } catch (error) {
      console.error('Error updating acknowledgment:', error);
      notifications.error({ description: 'Failed to update acknowledgment' });
      return false;
    }
  };

  const removeAcknowledgment = async (messageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_acknowledgments')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;

      notifications.success({ description: 'Acknowledgment removed' });
      await fetchAcknowledgments();
      return true;
    } catch (error) {
      console.error('Error removing acknowledgment:', error);
      notifications.error({ description: 'Failed to remove acknowledgment' });
      return false;
    }
  };

  const isMessageAcknowledgedByUser = (messageId: string, userId?: string): boolean => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return false;
    
    return acknowledgments.some(ack => 
      ack.messageId === messageId && ack.userId === targetUserId
    );
  };

  const getAcknowledgmentsByMessage = (messageId: string): MessageAcknowledgment[] => {
    return acknowledgments.filter(ack => ack.messageId === messageId);
  };

  const getAcknowledmentStats = (messageId: string) => {
    const messageAcks = getAcknowledgmentsByMessage(messageId);
    return {
      total: messageAcks.length,
      acknowledgedByCurrentUser: isMessageAcknowledgedByUser(messageId),
      acknowledgments: messageAcks,
    };
  };

  useEffect(() => {
    fetchAcknowledgments();
  }, [fetchAcknowledgments]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('acknowledgments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_acknowledgments',
        },
        () => {
          fetchAcknowledgments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAcknowledgments]);

  return {
    acknowledgments,
    loading,
    acknowledgeMessage,
    updateAcknowledgment,
    removeAcknowledgment,
    isMessageAcknowledgedByUser,
    getAcknowledgmentsByMessage,
    getAcknowledmentStats,
    refetch: fetchAcknowledgments,
  };
};