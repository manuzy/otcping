import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

interface BlastMessage {
  id: string;
  senderId: string;
  title: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledFor?: Date;
  sentAt?: Date;
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BlastRecipient {
  id: string;
  blastMessageId: string;
  recipientType: 'user' | 'chat' | 'institution';
  recipientId: string;
  status: 'pending' | 'sent' | 'failed' | 'opened';
  sentAt?: Date;
  openedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export const useBlastMessages = () => {
  const { user } = useAuth();
  const [blastMessages, setBlastMessages] = useState<BlastMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlastMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blast_messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedMessages = data?.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        title: msg.title,
        content: msg.content,
        status: msg.status as 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled',
        scheduledFor: msg.scheduled_for ? new Date(msg.scheduled_for) : undefined,
        sentAt: msg.sent_at ? new Date(msg.sent_at) : undefined,
        totalRecipients: msg.total_recipients,
        successfulSends: msg.successful_sends,
        failedSends: msg.failed_sends,
        createdAt: new Date(msg.created_at),
        updatedAt: new Date(msg.updated_at),
      })) || [];

      setBlastMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching blast messages:', error);
      notifications.error({ description: 'Failed to load blast messages' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createBlastMessage = async (
    title: string,
    content: string,
    recipients: Array<{ type: 'user' | 'chat' | 'institution'; id: string }>
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Create blast message
      const { data: blastData, error: blastError } = await supabase
        .from('blast_messages')
        .insert({
          sender_id: user.id,
          title,
          content,
          total_recipients: recipients.length,
        })
        .select()
        .single();

      if (blastError) throw blastError;

      // Create recipients
      const recipientInserts = recipients.map(recipient => ({
        blast_message_id: blastData.id,
        recipient_type: recipient.type,
        recipient_id: recipient.id,
      }));

      const { error: recipientsError } = await supabase
        .from('blast_recipients')
        .insert(recipientInserts);

      if (recipientsError) throw recipientsError;

      notifications.success({ description: 'Blast message created successfully' });
      await fetchBlastMessages();
      return blastData.id;
    } catch (error) {
      console.error('Error creating blast message:', error);
      notifications.error({ description: 'Failed to create blast message' });
      return null;
    }
  };

  const scheduleBlastMessage = async (
    blastMessageId: string,
    scheduledFor: Date
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blast_messages')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .eq('id', blastMessageId);

      if (error) throw error;

      notifications.success({ description: 'Blast message scheduled' });
      await fetchBlastMessages();
      return true;
    } catch (error) {
      console.error('Error scheduling blast message:', error);
      notifications.error({ description: 'Failed to schedule blast message' });
      return false;
    }
  };

  const sendBlastMessage = async (blastMessageId: string): Promise<boolean> => {
    try {
      // Update status to sending
      const { error: updateError } = await supabase
        .from('blast_messages')
        .update({ status: 'sending' })
        .eq('id', blastMessageId);

      if (updateError) throw updateError;

      // Call edge function to send blast
      const { error: sendError } = await supabase.functions.invoke('send-blast-message', {
        body: { blastMessageId },
      });

      if (sendError) throw sendError;

      notifications.success({ description: 'Blast message sent successfully' });
      await fetchBlastMessages();
      return true;
    } catch (error) {
      console.error('Error sending blast message:', error);
      notifications.error({ description: 'Failed to send blast message' });
      return false;
    }
  };

  const cancelBlastMessage = async (blastMessageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blast_messages')
        .update({ status: 'cancelled' })
        .eq('id', blastMessageId);

      if (error) throw error;

      notifications.success({ description: 'Blast message cancelled' });
      await fetchBlastMessages();
      return true;
    } catch (error) {
      console.error('Error cancelling blast message:', error);
      notifications.error({ description: 'Failed to cancel blast message' });
      return false;
    }
  };

  const getBlastRecipients = async (blastMessageId: string): Promise<BlastRecipient[]> => {
    try {
      const { data, error } = await supabase
        .from('blast_recipients')
        .select('*')
        .eq('blast_message_id', blastMessageId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data?.map(recipient => ({
        id: recipient.id,
        blastMessageId: recipient.blast_message_id,
        recipientType: recipient.recipient_type as 'user' | 'chat' | 'institution',
        recipientId: recipient.recipient_id,
        status: recipient.status as 'pending' | 'sent' | 'failed' | 'opened',
        sentAt: recipient.sent_at ? new Date(recipient.sent_at) : undefined,
        openedAt: recipient.opened_at ? new Date(recipient.opened_at) : undefined,
        errorMessage: recipient.error_message,
        createdAt: new Date(recipient.created_at),
      })) || [];
    } catch (error) {
      console.error('Error fetching blast recipients:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchBlastMessages();
  }, [fetchBlastMessages]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('blast_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blast_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchBlastMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBlastMessages]);

  return {
    blastMessages,
    loading,
    createBlastMessage,
    scheduleBlastMessage,
    sendBlastMessage,
    cancelBlastMessage,
    getBlastRecipients,
    refetch: fetchBlastMessages,
  };
};