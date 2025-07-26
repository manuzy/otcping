import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlinePresence } from './useOnlinePresence';
import { useToast } from '@/components/ui/use-toast';
import type { User } from '@/types';

// Add retry logic with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export function useChatParticipants(chatId: string | null) {
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { onlineUsers } = useOnlinePresence();
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const lastErrorRef = useRef<number>(0);

  // Fetch participants for a chat with retry logic
  const fetchParticipants = useCallback(async (retryCount = 0): Promise<void> => {
    if (!chatId || !mountedRef.current) return;

    try {
      console.log('🔍 Fetching participants for chat:', chatId, `(attempt ${retryCount + 1})`);
      
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          joined_at,
          profiles (
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

      console.log('📊 Participants query result:', { data, error, retryCount });

      if (error) throw error;

      if (!data) {
        console.warn('No participants data returned for chat:', chatId);
        return;
      }

      const transformedParticipants: User[] = data
        .filter(participant => participant.profiles) // Filter out null profiles
        .map(participant => ({
          id: participant.profiles.id,
          walletAddress: participant.profiles.wallet_address || '',
          displayName: participant.profiles.display_name || 'Unknown User',
          avatar: participant.profiles.avatar || '',
          isOnline: onlineUsers.has(participant.profiles.id),
          description: participant.profiles.description || '',
          isPublic: participant.profiles.is_public || false,
          reputation: participant.profiles.reputation || 0,
          successfulTrades: participant.profiles.successful_trades || 0,
          totalTrades: participant.profiles.total_trades || 0,
          joinedAt: new Date(participant.profiles.created_at),
          contacts: [] // Not needed for participants view
        }));

      if (mountedRef.current) {
        setParticipants(transformedParticipants);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching participants:', error, { chatId, retryCount });
      
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES && mountedRef.current) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        if (mountedRef.current) {
          return fetchParticipants(retryCount + 1);
        }
      }
      
      // Show error toast only after all retries failed
      if (retryCount >= MAX_RETRIES) {
        const now = Date.now();
        if (now - lastErrorRef.current > 5000) { // Only show error every 5 seconds
          lastErrorRef.current = now;
          if (mountedRef.current) {
            toast({
              title: "Error",
              description: "Failed to load chat participants",
              variant: "destructive",
            });
          }
        }
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [chatId, onlineUsers, toast]);

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

  // Create a stable reference to fetchParticipants to avoid recreation
  const fetchParticipantsRef = useRef(fetchParticipants);
  fetchParticipantsRef.current = fetchParticipants;

  // Set up real-time subscription for participants
  useEffect(() => {
    if (!chatId) return;

    console.log('🔄 Setting up participants subscription for chat:', chatId);
    
    // Initial fetch
    fetchParticipantsRef.current();

    const participantsChannel = supabase
      .channel(`participants-${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        console.log('📡 Participants change detected:', payload);
        // Use stable ref to avoid dependency issues
        fetchParticipantsRef.current();
      })
      .subscribe((status) => {
        console.log('📡 Participants subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up participants subscription for chat:', chatId);
      supabase.removeChannel(participantsChannel);
    };
  }, [chatId]); // Remove fetchParticipants from dependencies

  // Reset mounted ref when chat changes
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, [chatId]);

  // Update online status when presence changes
  useEffect(() => {
    if (mountedRef.current) {
      setParticipants(prev => prev.map(participant => ({
        ...participant,
        isOnline: onlineUsers.has(participant.id)
      })));
    }
  }, [onlineUsers]);

  return {
    participants,
    loading,
    addParticipant,
    removeParticipant,
    refetch: fetchParticipants
  };
}