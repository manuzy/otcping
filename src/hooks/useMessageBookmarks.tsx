import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

interface MessageBookmark {
  id: string;
  userId: string;
  messageId: string;
  chatId: string;
  category: string;
  notes?: string;
  createdAt: Date;
}

interface BookmarkedMessage extends MessageBookmark {
  messageContent: string;
  senderName: string;
  chatName: string;
  messageTimestamp: Date;
}

export const useMessageBookmarks = (chatId?: string) => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, fetch the bookmarks
      let query = supabase
        .from('message_bookmarks')
        .select('*')
        .eq('user_id', user.id);

      if (chatId) {
        query = query.eq('chat_id', chatId);
      }

      const { data: bookmarkData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!bookmarkData || bookmarkData.length === 0) {
        setBookmarks([]);
        return;
      }

      // Get unique message IDs and chat IDs
      const messageIds = [...new Set(bookmarkData.map(b => b.message_id))];
      const chatIds = [...new Set(bookmarkData.map(b => b.chat_id))];

      // Fetch messages data
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .in('id', messageIds);

      // Fetch chats data
      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, name')
        .in('id', chatIds);

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];

      // Fetch sender profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', senderIds);

      // Create lookup maps
      const messageMap = new Map(messagesData?.map(m => [m.id, m]) || []);
      const chatMap = new Map(chatsData?.map(c => [c.id, c]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      // Transform the data
      const transformedBookmarks: BookmarkedMessage[] = bookmarkData.map(bookmark => {
        const message = messageMap.get(bookmark.message_id);
        const chat = chatMap.get(bookmark.chat_id);
        
        return {
          id: bookmark.id,
          userId: bookmark.user_id,
          messageId: bookmark.message_id,
          chatId: bookmark.chat_id,
          category: bookmark.category,
          notes: bookmark.notes,
          createdAt: new Date(bookmark.created_at),
          messageContent: message?.content || 'Message not found',
          senderName: message ? (profileMap.get(message.sender_id) || 'Unknown User') : 'Unknown User',
          chatName: chat?.name || 'Chat not found',
          messageTimestamp: message ? new Date(message.created_at) : new Date(),
        };
      });

      setBookmarks(transformedBookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      notifications.error({ description: 'Failed to load bookmarks' });
    } finally {
      setLoading(false);
    }
  }, [user, chatId]);

  const addBookmark = async (
    messageId: string,
    chatId: string,
    category: string = 'general',
    notes?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .insert({
          user_id: user.id,
          message_id: messageId,
          chat_id: chatId,
          category,
          notes,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          notifications.info({ description: 'Message already bookmarked' });
          return false;
        }
        throw error;
      }

      notifications.success({ description: 'Message bookmarked' });
      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      notifications.error({ description: 'Failed to bookmark message' });
      return false;
    }
  };

  const removeBookmark = async (messageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('message_id', messageId);

      if (error) throw error;

      notifications.success({ description: 'Bookmark removed' });
      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      notifications.error({ description: 'Failed to remove bookmark' });
      return false;
    }
  };

  const updateBookmark = async (
    bookmarkId: string,
    updates: { category?: string; notes?: string }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_bookmarks')
        .update(updates)
        .eq('id', bookmarkId);

      if (error) throw error;

      notifications.success({ description: 'Bookmark updated' });
      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error updating bookmark:', error);
      notifications.error({ description: 'Failed to update bookmark' });
      return false;
    }
  };

  const isMessageBookmarked = (messageId: string): boolean => {
    return bookmarks.some(bookmark => bookmark.messageId === messageId);
  };

  const getBookmarkCategories = (): string[] => {
    const categories = [...new Set(bookmarks.map(b => b.category))];
    return categories.sort();
  };

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bookmarks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookmarks]);

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    updateBookmark,
    isMessageBookmarked,
    getBookmarkCategories,
    refetch: fetchBookmarks,
  };
};