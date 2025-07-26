import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';
import type { Chat, User } from '@/types';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch chats where user is a participant
  const fetchChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          trade:trades(*),
          chat_participants!inner(user_id, unread_count),
          messages(
            id,
            content,
            type,
            created_at,
            sender:profiles(id, display_name, avatar)
          )
        `)
        .eq('chat_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform data to match Chat interface
      const transformedChats: Chat[] = (data || []).map(chat => {
        const lastMessage = chat.messages?.length > 0 
          ? chat.messages[chat.messages.length - 1] 
          : undefined;
        
        const unreadCount = chat.chat_participants?.find(
          (p: any) => p.user_id === user.id
        )?.unread_count || 0;

        return {
          id: chat.id,
          name: chat.name,
          isPublic: chat.is_public,
          trade: chat.trade ? {
            id: chat.trade.id,
            chain: chat.trade.chain,
            pair: chat.trade.pair,
            size: chat.trade.size,
            price: chat.trade.price,
            type: chat.trade.type as 'buy' | 'sell',
            status: chat.trade.status as 'active' | 'completed' | 'cancelled',
            createdAt: new Date(chat.trade.created_at),
            createdBy: chat.trade.created_by
          } : undefined,
          participants: [], // Will be populated separately
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            chatId: chat.id,
            senderId: lastMessage.sender?.id || '',
            content: lastMessage.content,
            type: lastMessage.type,
            timestamp: new Date(lastMessage.created_at)
          } : undefined,
          unreadCount,
          lastActivity: new Date(chat.updated_at)
        };
      });

      setChats(transformedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced auth validation function
  const validateAuthContext = async (): Promise<boolean> => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('[Auth Validation] No valid session found');
        return false;
      }

      // Test auth context with a simple query
      const { data: authTest, error: authError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (authError) {
        console.log('[Auth Validation] Auth context test failed:', authError);
        return false;
      }

      console.log('[Auth Validation] Auth context is valid');
      return true;
    } catch (error) {
      console.log('[Auth Validation] Validation failed:', error);
      return false;
    }
  };

  // Create a new chat with enhanced retry logic and pre-flight auth testing
  const createChat = async (
    name: string, 
    isPublic: boolean = false, 
    tradeId?: string, 
    participantIds: string[] = []
  ): Promise<string | null> => {
    if (!user) {
      console.error('No user authenticated');
      return null;
    }

    const maxRetries = 5; // Increased retries
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Chat Creation] Attempt ${attempt}/${maxRetries}`);
        
        // Pre-flight auth validation for all attempts
        console.log('[Chat Creation] Validating auth context...');
        const authValid = await validateAuthContext();
        
        if (!authValid) {
          console.log('[Chat Creation] Auth context invalid, refreshing session...');
          
          // Wait progressively longer between attempts
          const waitTime = Math.min(1000 * attempt, 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Force session refresh
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshedSession) {
            console.warn('[Chat Creation] Session refresh failed:', refreshError);
            lastError = new Error('Session validation failed');
            continue;
          }
          
          console.log('[Chat Creation] Session refreshed, re-validating...');
          
          // Wait a bit more for session to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-validate auth context
          const revalidated = await validateAuthContext();
          if (!revalidated) {
            console.warn('[Chat Creation] Re-validation failed after refresh');
            lastError = new Error('Auth context validation failed after refresh');
            continue;
          }
        }

        console.log('[Chat Creation] Auth context validated, creating chat...');

        // Create chat with explicit auth header
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            name,
            is_public: isPublic,
            trade_id: tradeId
          })
          .select()
          .single();

        if (chatError) {
          console.error(`[Chat Creation] Chat creation error (attempt ${attempt}):`, chatError);
          lastError = chatError;
          
          // If it's an RLS policy violation, continue retrying
          if (chatError.message?.includes('row-level security policy')) {
            console.log('[Chat Creation] RLS policy violation, will retry...');
            continue;
          }
          
          // For other errors, don't retry
          throw chatError;
        }

        console.log('[Chat Creation] Chat created successfully:', chat.id);

        // Add current user as participant with the same auth validation
        const participantsToAdd = [user.id, ...participantIds].filter((id, index, arr) => 
          arr.indexOf(id) === index // Remove duplicates
        );

        console.log('[Chat Creation] Adding participants:', participantsToAdd);
        const { error: participantError } = await supabase
          .from('chat_participants')
          .insert(
            participantsToAdd.map(userId => ({
              chat_id: chat.id,
              user_id: userId
            }))
          );

        if (participantError) {
          console.error('[Chat Creation] Participant creation error:', participantError);
          // If participants fail, we should clean up the chat
          await supabase.from('chats').delete().eq('id', chat.id);
          throw participantError;
        }

        console.log('[Chat Creation] Participants added successfully');
        
        toast({
          title: "Chat created",
          description: `Chat "${name}" has been created`,
        });

        return chat.id;
      } catch (error) {
        console.error(`[Chat Creation] Error (attempt ${attempt}):`, error);
        lastError = error;
        
        // If this is the last attempt, break
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // All attempts failed
    console.error('[Chat Creation] All attempts failed. Last error:', lastError);
    toast({
      title: "Error",
      description: lastError?.message?.includes('row-level security policy') 
        ? "Authentication issue - please try refreshing the page" 
        : "Failed to create chat",
      variant: "destructive",
    });
    return null;
  };

  // Join an existing chat
  const joinChat = async (chatId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chatId,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Joined chat",
        description: "You have joined the chat",
      });

      return true;
    } catch (error) {
      console.error('Error joining chat:', error);
      toast({
        title: "Error",
        description: "Failed to join chat",
        variant: "destructive",
      });
      return false;
    }
  };

  // Mark messages as read
  const markAsRead = async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ unread_count: 0 })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, unreadCount: 0 }
          : chat
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchChats();

    // Subscribe to chat changes
    const chatsChannel = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats'
      }, () => {
        fetchChats(); // Refetch when chats change
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchChats(); // Refetch when messages change
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants'
      }, () => {
        fetchChats(); // Refetch when participants change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [user]);

  return {
    chats,
    loading,
    createChat,
    joinChat,
    markAsRead,
    refetch: fetchChats
  };
}