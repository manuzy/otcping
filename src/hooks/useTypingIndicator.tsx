import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTypingIndicator = (chatId: string) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();

  const startTyping = useCallback(() => {
    if (!user || isTyping) return;
    
    setIsTyping(true);
    
    // Broadcast typing status
    const channel = supabase.channel(`typing:${chatId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          user_id: user.id,
          typing: true,
          timestamp: Date.now()
        });
      }
    });

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [user, chatId, isTyping]);

  const stopTyping = useCallback(() => {
    if (!user || !isTyping) return;
    
    setIsTyping(false);
    
    const channel = supabase.channel(`typing:${chatId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          user_id: user.id,
          typing: false,
          timestamp: Date.now()
        });
      }
    });

    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 100);
  }, [user, chatId, isTyping]);

  // Listen for typing indicators from other users
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`typing-listener:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const currentlyTyping = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.typing && presence.user_id !== user.id) {
              // Only show as typing if timestamp is recent (within 5 seconds)
              const isRecent = Date.now() - presence.timestamp < 5000;
              if (isRecent) {
                currentlyTyping.add(presence.user_id);
              }
            }
          });
        });
        
        setTypingUsers(currentlyTyping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  return {
    typingUsers: Array.from(typingUsers),
    startTyping,
    stopTyping,
    isTyping
  };
};