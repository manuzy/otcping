import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online_presence');

    // Track current user's presence
    const userStatus = {
      user_id: user.id,
      online_at: new Date().toISOString(),
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineUserIds = new Set<string>();
        
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            onlineUserIds.add(presence.user_id);
          });
        });
        
        setOnlineUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          newPresences.forEach((presence: any) => {
            updated.add(presence.user_id);
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          leftPresences.forEach((presence: any) => {
            updated.delete(presence.user_id);
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userStatus);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  return {
    onlineUsers,
    isUserOnline
  };
}