import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlinePresence } from './useOnlinePresence';
import { useToast } from '@/components/ui/use-toast';
import type { User } from '@/types';

export function useChatParticipants(chatId: string | null) {
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isUserOnline } = useOnlinePresence();
  const { toast } = useToast();

  // Fetch participants for a chat
  const fetchParticipants = async () => {
    if (!chatId) return;

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          joined_at,
          profiles!inner(
            id,
            display_name,
            avatar,
            description,
            is_public,
            reputation,
            successful_trades,
            total_trades,
            created_at,
            wallet_address
          )
        `)
        .eq('chat_id', chatId);

      if (error) throw error;

      const transformedParticipants: User[] = (data || []).map(participant => ({
        id: participant.profiles.id,
        walletAddress: participant.profiles.wallet_address || '',
        displayName: participant.profiles.display_name,
        avatar: participant.profiles.avatar || '',
        isOnline: isUserOnline(participant.profiles.id),
        description: participant.profiles.description || '',
        isPublic: participant.profiles.is_public,
        reputation: participant.profiles.reputation,
        successfulTrades: participant.profiles.successful_trades,
        totalTrades: participant.profiles.total_trades,
        joinedAt: new Date(participant.profiles.created_at),
        contacts: [] // Not needed for participants view
      }));

      setParticipants(transformedParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Error",
        description: "Failed to load chat participants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a participant to the chat
  const addParticipant = async (userId: string) => {
    if (!chatId || !user) return false;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chatId,
          user_id: userId
        });

      if (error) throw error;

      toast({
        title: "Participant added",
        description: "User has been added to the chat",
      });

      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: "Error",
        description: "Failed to add participant",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove a participant from the chat
  const removeParticipant = async (userId: string) => {
    if (!chatId || !user) return false;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Participant removed",
        description: "User has been removed from the chat",
      });

      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive",
      });
      return false;
    }
  };

  // Set up real-time subscription for participants
  useEffect(() => {
    if (!chatId) return;

    fetchParticipants();

    const participantsChannel = supabase
      .channel(`participants-${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, () => {
        fetchParticipants(); // Refetch when participants change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }, [chatId]);

  // Update online status when presence changes
  useEffect(() => {
    setParticipants(prev => prev.map(participant => ({
      ...participant,
      isOnline: isUserOnline(participant.id)
    })));
  }, [isUserOnline]);

  return {
    participants,
    loading,
    addParticipant,
    removeParticipant,
    refetch: fetchParticipants
  };
}