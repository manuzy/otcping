import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, Trade } from '@/types';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function usePublicTrades() {
  const [trades, setTrades] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const isUnmountedRef = useRef(false);
  const errorToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (errorToastTimeoutRef.current) {
        clearTimeout(errorToastTimeoutRef.current);
      }
    };
  }, []);

  const fetchPublicTrades = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching public trades...');
      
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          trade:trades(*),
          messages(
            id,
            content,
            type,
            created_at,
            sender:profiles(id, display_name, avatar)
          )
        `)
        .eq('is_public', true)
        .not('trade_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Only update state if component is still mounted
      if (isUnmountedRef.current) return;

      console.log('Raw public trades data:', data);

      // Transform data to match Chat interface
      const transformedTrades: Chat[] = (data || []).map(chat => {
        try {
          const lastMessage = chat.messages?.length > 0 
            ? chat.messages[chat.messages.length - 1] 
            : undefined;

          return {
            id: chat.id,
            name: chat.name || 'Public Trade',
            isPublic: true,
            trade: chat.trade ? {
              id: chat.trade.id,
              chain: chat.trade.chain || '',
              chain_id: chat.trade.chain_id || null,
              pair: chat.trade.pair || '',
              size: chat.trade.size || '',
              price: chat.trade.price || '',
              type: (chat.trade.type as 'buy' | 'sell') || 'buy',
              status: (chat.trade.status as 'active' | 'completed' | 'cancelled') || 'active',
              createdAt: chat.trade.created_at ? new Date(chat.trade.created_at) : new Date(),
              createdBy: chat.trade.created_by || '',
              limitPrice: chat.trade.limit_price || undefined,
              usdAmount: chat.trade.usd_amount || undefined,
              sellAsset: chat.trade.sell_asset || undefined,
              buyAsset: chat.trade.buy_asset || undefined,
              expectedExecution: chat.trade.expected_execution ? new Date(chat.trade.expected_execution) : undefined,
              expiryType: chat.trade.expiry_type || undefined,
              expiryTimestamp: chat.trade.expiry_timestamp ? new Date(chat.trade.expiry_timestamp) : undefined,
              triggerAsset: chat.trade.trigger_asset || undefined,
              triggerCondition: chat.trade.trigger_condition || undefined,
              triggerPrice: chat.trade.trigger_price || undefined
            } : undefined,
            participants: [],
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              chatId: chat.id,
              senderId: lastMessage.sender?.id || '',
              content: lastMessage.content || '',
              type: (lastMessage.type as 'message' | 'trade_action' | 'system') || 'message',
              timestamp: lastMessage.created_at ? new Date(lastMessage.created_at) : new Date()
            } : undefined,
            unreadCount: 0,
            lastActivity: chat.updated_at ? new Date(chat.updated_at) : new Date()
          };
        } catch (transformError) {
          console.error('Error transforming chat data:', transformError, chat);
          return null;
        }
      }).filter(chat => chat !== null) as Chat[];

      console.log('Transformed public trades:', transformedTrades);
      setTrades(transformedTrades);
      
    } catch (error) {
      console.error('Error fetching public trades:', error);
      
      // Debounce error toasts to prevent spam
      if (errorToastTimeoutRef.current) {
        clearTimeout(errorToastTimeoutRef.current);
      }
      
      errorToastTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          toast({
            title: "Error loading public trades",
            description: "Failed to load public trades. Please try again.",
            variant: "destructive",
          });
        }
      }, 1000);
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchPublicTrades();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions for public trades');

    const chatsChannel = supabase
      .channel('public_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: 'is_public=eq.true'
        },
        (payload) => {
          console.log('Public chat change detected:', payload);
          // Debounced fetch to avoid too many calls
          setTimeout(() => {
            if (!isUnmountedRef.current) {
              fetchPublicTrades();
            }
          }, 500);
        }
      )
      .subscribe();

    const tradesChannel = supabase
      .channel('public_trades_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          console.log('Trade change detected:', payload);
          // Debounced fetch to avoid too many calls
          setTimeout(() => {
            if (!isUnmountedRef.current) {
              fetchPublicTrades();
            }
          }, 500);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up public trades subscriptions');
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(tradesChannel);
    };
  }, [user]);

  return {
    trades,
    loading,
    refetch: fetchPublicTrades
  };
}