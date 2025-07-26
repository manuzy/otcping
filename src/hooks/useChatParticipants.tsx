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
  const abortControllerRef = useRef<AbortController | null>(null);
  const onlineUsersRef = useRef(onlineUsers);
  const toastRef = useRef(toast);
  const requestInFlightRef = useRef(false);
  const fetchParticipantsRef = useRef<(retryCount?: number) => Promise<void>>();

  // Update refs to current values
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
    toastRef.current = toast;
  });

  // Create stable fetch function
  useEffect(() => {
    const fetchParticipants = async (retryCount = 0): Promise<void> => {
      if (!chatId || !mountedRef.current || requestInFlightRef.current) return;

      requestInFlightRef.current = true;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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
          .eq('chat_id', chatId)
          .abortSignal(abortController.signal);

        console.log('📊 Participants query result:', { data, error, retryCount });

        if (error) throw error;

        if (!data) {
          console.warn('No participants data returned for chat:', chatId);
          requestInFlightRef.current = false;
          return;
        }

        const transformedParticipants: User[] = data
          .filter(participant => participant.profiles) // Filter out null profiles
          .map(participant => ({
            id: participant.profiles.id,
            walletAddress: participant.profiles.wallet_address || '',
            displayName: participant.profiles.display_name || 'Unknown User',
            avatar: participant.profiles.avatar || '',
            isOnline: onlineUsersRef.current.has(participant.profiles.id),
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
        requestInFlightRef.current = false;
      } catch (error: any) {
        requestInFlightRef.current = false;
        
        // Ignore aborted requests
        if (error?.name === 'AbortError') {
          console.log('Request aborted for chat:', chatId);
          return;
        }

        console.error('Error fetching participants:', error, { chatId, retryCount });
        
        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES && mountedRef.current) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);
          await sleep(delay);
          if (mountedRef.current) {
            return fetchParticipantsRef.current?.(retryCount + 1);
          }
        }
        
        // Show error toast only after all retries failed
        if (retryCount >= MAX_RETRIES) {
          const now = Date.now();
          if (now - lastErrorRef.current > 5000) { // Only show error every 5 seconds
            lastErrorRef.current = now;
            if (mountedRef.current) {
              toastRef.current({
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
    };

    fetchParticipantsRef.current = fetchParticipants;
    
    if (chatId) {
      fetchParticipants();
    }
  }, [chatId]);

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

      toastRef.current({
        title: "Participant added",
        description: "User has been added to the chat",
      });

      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toastRef.current({
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

      toastRef.current({
        title: "Participant removed",
        description: "User has been removed from the chat",
      });

      return true;
    } catch (error) {
      console.error('Error removing participant:', error);
      toastRef.current({
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

    console.log('🔄 Setting up participants subscription for chat:', chatId);

    const participantsChannel = supabase
      .channel(`participants-${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        console.log('📡 Participants change detected:', payload);
        // Increased debounce to prevent multiple calls
        setTimeout(() => {
          if (mountedRef.current && fetchParticipantsRef.current) {
            fetchParticipantsRef.current();
          }
        }, 500);
      })
      .subscribe((status) => {
        console.log('📡 Participants subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up participants subscription for chat:', chatId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      supabase.removeChannel(participantsChannel);
    };
  }, [chatId]);

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
    refetch: () => fetchParticipantsRef.current?.()
  };
}