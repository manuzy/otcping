import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChatSearchResult } from '@/types/chat';
import { logger } from '@/lib/logger';

export const useChatSearch = () => {
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const searchMessages = useCallback(async (
    query: string,
    options?: {
      chatId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      senderId?: string;
    }
  ): Promise<ChatSearchResult[]> => {
    if (!user || !query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    
    try {
      let supabaseQuery = supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(display_name),
          chat:chats!messages_chat_id_fkey(name, is_public)
        `)
        .textSearch('search_vector', query.trim());

      // Add filters
      if (options?.chatId) {
        supabaseQuery = supabaseQuery.eq('chat_id', options.chatId);
      }

      if (options?.dateFrom) {
        supabaseQuery = supabaseQuery.gte('created_at', options.dateFrom.toISOString());
      }

      if (options?.dateTo) {
        supabaseQuery = supabaseQuery.lte('created_at', options.dateTo.toISOString());
      }

      if (options?.senderId) {
        supabaseQuery = supabaseQuery.eq('sender_id', options.senderId);
      }

      // Only include messages from chats the user participates in
      supabaseQuery = supabaseQuery.or(`
        chat.created_by.eq.${user.id},
        chat_participants.user_id.eq.${user.id}
      `, { foreignTable: 'chats.chat_participants' });

      const { data, error } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const searchResults: ChatSearchResult[] = data.map(item => ({
        messageId: item.id,
        chatId: item.chat_id,
        content: item.content,
        timestamp: new Date(item.created_at),
        senderName: item.sender?.display_name || 'Unknown',
        chatName: item.chat?.name || 'Unknown Chat',
        context: generateContext(item.content, query)
      }));

      setResults(searchResults);
      return searchResults;
    } catch (error) {
      logger.error('Failed to search messages', { query, options }, error as Error);
      setResults([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateContext = (content: string, query: string): string => {
    const words = content.split(' ');
    const queryWords = query.toLowerCase().split(' ');
    
    // Find the first occurrence of any query word
    let matchIndex = -1;
    for (let i = 0; i < words.length; i++) {
      if (queryWords.some(qWord => words[i].toLowerCase().includes(qWord.toLowerCase()))) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) return content.slice(0, 100) + '...';

    // Get context around the match (5 words before and after)
    const start = Math.max(0, matchIndex - 5);
    const end = Math.min(words.length, matchIndex + 6);
    
    let context = words.slice(start, end).join(' ');
    
    if (start > 0) context = '...' + context;
    if (end < words.length) context = context + '...';
    
    return context;
  };

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    searchMessages,
    clearResults
  };
};