import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { errorHandler } from '@/lib/errorHandler';
import type { Message } from '@/types';

export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const isUnmountedRef = useRef(false);

  // Fetch messages for a chat
  const fetchMessages = async () => {
    if (!chatId || !user || isUnmountedRef.current) return;

    logger.debug('Fetching messages', {
      component: 'useMessages',
      operation: 'fetchMessages',
      chatId,
      userId: user.id
    });

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
      
      logger.info('Messages fetched successfully', {
        component: 'useMessages',
        chatId,
        count: transformedMessages.length
      });
    } catch (error) {
      const appError = errorHandler.handle(error);
      logger.error('Failed to fetch messages', {
        component: 'useMessages',
        chatId,
        userId: user.id
      }, appError);
      
      if (!isUnmountedRef.current) {
        notifications.loadingError('messages');
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

    logger.debug('Sending message', {
      component: 'useMessages',
      operation: 'sendMessage',
      chatId,
      userId: user.id,
      messageType: type,
      contentLength: content.trim().length
    });

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

      if (isUnmountedRef.current) return true;
      
      logger.info('Message sent successfully', {
        component: 'useMessages',
        operation: 'sendMessage',
        chatId,
        messageId: data.id
      });

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
        logger.warn('Failed to increment unread count', {
          component: 'useMessages',
          operation: 'incrementUnreadCount',
          chatId
        }, rpcError);
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
          logger.warn('Failed to get chat participants for notifications', {
            component: 'useMessages',
            operation: 'getParticipants',
            chatId
          }, participantsError);
        } else if (participants && participants.length > 0) {
          // Get sender's display name
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();

          const senderDisplayName = senderProfile?.display_name || 'Someone';

          logger.debug('Sending notifications to participants', {
            component: 'useMessages',
            operation: 'sendNotifications',
            chatId,
            participantCount: participants.length
          });
          
          for (const participant of participants) {
            try {
              const { data: notificationData, error: notificationError } = await supabase.functions.invoke('send-message-notification', {
                body: {
                  chatId,
                  senderDisplayName,
                  messageContent: content.trim(),
                  recipientUserId: participant.user_id,
                },
              });

              if (notificationError) {
                logger.warn('Failed to send notification to participant', {
                  component: 'useMessages',
                  operation: 'sendNotification',
                  chatId,
                  recipientUserId: participant.user_id
                }, notificationError);
              } else {
                logger.debug('Notification sent successfully', {
                  component: 'useMessages',
                  operation: 'sendNotification',
                  chatId,
                  recipientUserId: participant.user_id
                });
              }
            } catch (notificationError) {
              logger.error('Error sending notification to participant', {
                component: 'useMessages',
                operation: 'sendNotification',
                chatId,
                recipientUserId: participant.user_id
              }, notificationError);
              // Don't throw here - notification failures shouldn't break message sending
            }
          }
        }
      } catch (error) {
        logger.warn('Error in notification process', {
          component: 'useMessages',
          operation: 'sendNotifications',
          chatId
        }, error);
        // Don't throw here - notification failures shouldn't break message sending
      }

      return true;
    } catch (error) {
      const appError = errorHandler.handle(error);
      logger.error('Failed to send message', {
        component: 'useMessages',
        operation: 'sendMessage',
        chatId,
        userId: user.id
      }, appError);
      
      if (!isUnmountedRef.current) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
        
        notifications.error({
          description: "Failed to send message"
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
    
    logger.debug('Setting up messages subscription', {
      component: 'useMessages',
      operation: 'setupSubscription',
      chatId,
      userId: user.id
    });

    fetchMessages();

    const messagesChannel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        logger.debug('Real-time message received', {
          component: 'useMessages',
          operation: 'realtimeMessage',
          chatId,
          messageId: payload.new.id,
          senderId: payload.new.sender_id
        });
        
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
          
          logger.debug('Adding real-time message to UI', {
            component: 'useMessages',
            messageId: newMessage.id
          });
          return [...withoutTemp, newMessage];
        });
      })
      .subscribe((status) => {
        logger.debug('Messages subscription status updated', {
          component: 'useMessages',
          chatId,
          status
        });
      });

    return () => {
      logger.debug('Cleaning up messages subscription', {
        component: 'useMessages',
        chatId
      });
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