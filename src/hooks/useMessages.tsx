import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/types';

export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isUnmountedRef = useRef(false);

  // Fetch messages for a chat
  const fetchMessages = async () => {
    if (!chatId || !user || isUnmountedRef.current) return;

    console.log('🔍 Fetching messages for chat:', chatId, 'user:', user.id);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, display_name, avatar)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('📨 Fetched messages:', data?.length || 0, 'messages');

      if (isUnmountedRef.current) return;

      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        content: msg.content,
        type: msg.type,
        timestamp: new Date(msg.created_at)
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      if (!isUnmountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Send a new message
  const sendMessage = async (content: string, type: 'message' | 'trade_action' | 'system' = 'message') => {
    if (!chatId || !user || !content.trim() || isUnmountedRef.current) return false;

    console.log('📤 Sending message:', content, 'in chat:', chatId, 'by user:', user.id);

    setSending(true);
    try {
      // Optimistic update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        chatId,
        senderId: user.id,
        content: content.trim(),
        type,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, tempMessage]);

      // Send to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: content.trim(),
          type
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent successfully:', data.id);

      if (isUnmountedRef.current) return true;

      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? {
              ...msg,
              id: data.id,
              timestamp: new Date(data.created_at)
            }
          : msg
      ));

      // Increment unread count for other participants
      const { error: rpcError } = await supabase.rpc('increment_unread_count', {
        chat_id: chatId,
        sender_id: user.id
      });

      if (rpcError) {
        console.error('⚠️ Error incrementing unread count:', rpcError);
      }

      // Get chat participants to send notifications
      try {
        const { data: participants, error: participantsError } = await supabase
          .from('chat_participants')
          .select(`
            user_id,
            profiles(id, display_name)
          `)
          .eq('chat_id', chatId)
          .neq('user_id', user.id);

        if (participantsError) {
          console.error('⚠️ Error getting chat participants:', participantsError);
        } else if (participants && participants.length > 0) {
          // Get sender's display name
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();

          const senderDisplayName = senderProfile?.display_name || 'Someone';

          // Send notification to each participant
          for (const participant of participants) {
            try {
              await supabase.functions.invoke('send-message-notification', {
                body: {
                  chatId,
                  senderDisplayName,
                  messageContent: content.trim(),
                  recipientUserId: participant.user_id,
                },
              });
            } catch (notificationError) {
              console.error('⚠️ Error sending notification to user:', participant.user_id, notificationError);
              // Don't throw here - notification failures shouldn't break message sending
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Error in notification process:', error);
        // Don't throw here - notification failures shouldn't break message sending
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      if (!isUnmountedRef.current) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
        
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      if (!isUnmountedRef.current) {
        setSending(false);
      }
    }
  };

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!chatId || !user) return;

    // Mark component as mounted
    isUnmountedRef.current = false;
    
    console.log('🔗 Setting up real-time subscription for chat:', chatId, 'user:', user.id);

    fetchMessages();

    const messagesChannel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        console.log('📨 Real-time message received:', payload);
        
        if (isUnmountedRef.current) return;

        // Add message from any user (including current user for consistency)
        // The optimistic update will be replaced by this real message
        const newMessage: Message = {
          id: payload.new.id,
          chatId: payload.new.chat_id,
          senderId: payload.new.sender_id,
          content: payload.new.content,
          type: payload.new.type,
          timestamp: new Date(payload.new.created_at)
        };

        setMessages(prev => {
          // Remove any temporary message with same content and sender
          const withoutTemp = prev.filter(msg => 
            !(msg.id.startsWith('temp-') && 
              msg.senderId === newMessage.senderId && 
              msg.content === newMessage.content)
          );
          
          // Check if this message already exists (avoid duplicates)
          const exists = withoutTemp.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          console.log('✅ Adding real-time message to UI:', newMessage.id);
          return [...withoutTemp, newMessage];
        });
      })
      .subscribe((status) => {
        console.log('📡 Message subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up message subscription for chat:', chatId);
      isUnmountedRef.current = true;
      supabase.removeChannel(messagesChannel);
    };
  }, [chatId, user]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: fetchMessages
  };
}