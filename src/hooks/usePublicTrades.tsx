import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, Trade } from '@/types';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

export function usePublicTrades() {
  const [trades, setTrades] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
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
      logger.debug('Fetching public trades', { 
        userId: user?.id,
        operation: 'fetch_public_trades' 
      });
      
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

      logger.debug('Retrieved public trades data', { 
        operation: 'fetch_public_trades',
        metadata: { tradesCount: data?.length || 0 }
      });

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
          logger.error('Error transforming chat data', {
            operation: 'transform_trade_data',
            metadata: { chatId: chat?.id }
          }, transformError as Error);
          return null;
        }
      }).filter(chat => chat !== null) as Chat[];

      logger.info('Public trades fetched successfully', {
        operation: 'fetch_public_trades',
        metadata: { tradesCount: transformedTrades.length }
      });
      setTrades(transformedTrades);
      
    } catch (error) {
      logger.error('Error fetching public trades', {
        operation: 'fetch_public_trades',
        userId: user?.id
      }, error as Error);
      
      // Debounce error toasts to prevent spam
      if (errorToastTimeoutRef.current) {
        clearTimeout(errorToastTimeoutRef.current);
      }
      
      errorToastTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          notifications.loadingError('public trades');
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

    logger.debug('Setting up real-time subscriptions for public trades', {
      operation: 'setup_realtime_subscriptions'
    });

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
          logger.debug('Public chat change detected', {
            operation: 'realtime_chat_change',
            metadata: { eventType: payload.eventType, table: 'chats' }
          });
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
          logger.debug('Trade change detected', {
            operation: 'realtime_trade_change',
            metadata: { eventType: payload.eventType, table: 'trades' }
          });
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
      logger.debug('Cleaning up public trades subscriptions', {
        operation: 'cleanup_realtime_subscriptions'
      });
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