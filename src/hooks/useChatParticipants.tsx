import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlinePresence } from './useOnlinePresence';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import { errorHandler } from '@/lib/errorHandler';
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
  const mountedRef = useRef(true);
  const lastErrorRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onlineUsersRef = useRef(onlineUsers);
  const requestInFlightRef = useRef(false);
  const fetchParticipantsRef = useRef<(retryCount?: number) => Promise<void>>();

  // Update refs to current values
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
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
        logger.debug('Fetching chat participants', {
          component: 'useChatParticipants',
          operation: 'fetchParticipants',
          chatId,
          retryCount: retryCount + 1
        });
        
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
              wallet_address,
              kyc_level,
              trader_type,
              licenses,
              kyb_status,
              kyb_provider,
              kyb_verified_at,
              kyb_verification_type
            )
          `)
          .eq('chat_id', chatId)
          .abortSignal(abortController.signal);

        if (error) throw error;

        if (!data) {
          logger.warn('No participants data returned', {
            component: 'useChatParticipants',
            chatId
          });
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
            contacts: [], // Not needed for participants view
            kycLevel: (participant.profiles.kyc_level as 'Level 0' | 'Level 1' | 'Level 2') || 'Level 0',
            traderType: (participant.profiles.trader_type as 'Degen' | 'Institutional') || 'Degen',
            licenses: participant.profiles.licenses || [],
            kybStatus: (participant.profiles.kyb_status as 'verified' | 'not_verified' | 'pending') || 'not_verified',
            kybProvider: participant.profiles.kyb_provider || undefined,
            kybVerifiedAt: participant.profiles.kyb_verified_at ? new Date(participant.profiles.kyb_verified_at) : undefined,
            kybVerificationType: participant.profiles.kyb_verification_type as 'basic' | 'full' | undefined,
          }));

        if (mountedRef.current) {
          setParticipants(transformedParticipants);
          setLoading(false);
        }
        requestInFlightRef.current = false;
        
        logger.info('Chat participants fetched successfully', {
          component: 'useChatParticipants',
          chatId,
          count: transformedParticipants.length
        });
      } catch (error: any) {
        requestInFlightRef.current = false;
        
        // Ignore aborted requests
        if (error?.name === 'AbortError') {
          logger.debug('Participants fetch request aborted', {
            component: 'useChatParticipants',
            chatId
          });
          return;
        }

        const appError = errorHandler.handle(error, false);
        logger.error('Failed to fetch chat participants', {
          component: 'useChatParticipants',
          chatId,
          retryCount
        }, appError);
        
        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES && mountedRef.current) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          logger.debug('Retrying participants fetch', {
            component: 'useChatParticipants',
            chatId,
            delay,
            retryCount: retryCount + 1
          });
          await sleep(delay);
          if (mountedRef.current) {
            return fetchParticipantsRef.current?.(retryCount + 1);
          }
        }
        
        // Show error notification only after all retries failed
        if (retryCount >= MAX_RETRIES) {
          const now = Date.now();
          if (now - lastErrorRef.current > 5000) { // Only show error every 5 seconds
            lastErrorRef.current = now;
            if (mountedRef.current) {
              notifications.loadingError('chat participants');
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

      notifications.success({
        description: "User has been added to the chat"
      });

      logger.info('Participant added successfully', {
        component: 'useChatParticipants',
        operation: 'addParticipant',
        chatId,
        userId
      });

      return true;
    } catch (error) {
      const appError = errorHandler.handle(error);
      logger.error('Failed to add participant', {
        component: 'useChatParticipants',
        operation: 'addParticipant',
        chatId,
        userId
      }, appError);
      
      notifications.error({
        description: "Failed to add participant"
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

      notifications.success({
        description: "User has been removed from the chat"
      });

      logger.info('Participant removed successfully', {
        component: 'useChatParticipants',
        operation: 'removeParticipant',
        chatId,
        userId
      });

      return true;
    } catch (error) {
      const appError = errorHandler.handle(error);
      logger.error('Failed to remove participant', {
        component: 'useChatParticipants',
        operation: 'removeParticipant',
        chatId,
        userId
      }, appError);
      
      notifications.error({
        description: "Failed to remove participant"
      });
      return false;
    }
  };

  // Set up real-time subscription for participants
  useEffect(() => {
    if (!chatId) return;

    logger.debug('Setting up participants subscription', {
      component: 'useChatParticipants',
      operation: 'setupSubscription',
      chatId
    });

    const participantsChannel = supabase
      .channel(`participants-${chatId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        logger.debug('Participants change detected', {
          component: 'useChatParticipants',
          operation: 'realtimeUpdate',
          chatId,
          event: payload.eventType
        });
        // Increased debounce to prevent multiple calls
        setTimeout(() => {
          if (mountedRef.current && fetchParticipantsRef.current) {
            fetchParticipantsRef.current();
          }
        }, 500);
      })
      .subscribe((status) => {
        logger.debug('Participants subscription status updated', {
          component: 'useChatParticipants',
          chatId,
          status
        });
      });

    return () => {
      logger.debug('Cleaning up participants subscription', {
        component: 'useChatParticipants',
        chatId
      });
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