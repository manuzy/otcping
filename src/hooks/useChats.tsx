import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
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

  // Enhanced auth validation function that tests actual database auth context
  const validateAuthContext = async (): Promise<{ valid: boolean; uid?: string }> => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('[Auth Validation] No valid session found');
        return { valid: false };
      }

      console.log('[Auth Validation] Session token exists, testing database auth context...');

      // Test the actual auth.uid() function that RLS policies use
      // This directly tests what the database sees
      const { data: authTest, error: authError } = await supabase
        .rpc('auth_uid_test');

      if (authError) {
        console.log('[Auth Validation] Database auth.uid() test failed:', authError);
        return { valid: false };
      }

      const dbUid = authTest;
      console.log('[Auth Validation] Database auth.uid() returns:', dbUid);
      console.log('[Auth Validation] Frontend user.id:', user?.id);

      if (!dbUid) {
        console.log('[Auth Validation] Database auth.uid() is NULL - this is the RLS issue!');
        return { valid: false };
      }

      if (dbUid !== user?.id) {
        console.log('[Auth Validation] UID mismatch between frontend and database');
        return { valid: false, uid: dbUid };
      }

      console.log('[Auth Validation] Database auth context is valid and matches frontend');
      return { valid: true, uid: dbUid };
    } catch (error) {
      console.log('[Auth Validation] Validation failed:', error);
      return { valid: false };
    }
  };

  // Force token synchronization with database
  const synchronizeAuthToken = async (): Promise<boolean> => {
    try {
      console.log('[Token Sync] Forcing session refresh and token sync...');
      
      // First, get the current session to see what we have
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('[Token Sync] Current session exists:', !!currentSession);
      
      // Force a session refresh to get the latest token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        console.log('[Token Sync] Session refresh failed:', sessionError);
        return false;
      }

      console.log('[Token Sync] Session refreshed successfully');

      // Give the database time to process the new token
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test with a simple RLS-protected query to ensure token is working
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .limit(1);

      if (testError) {
        console.log('[Token Sync] RLS test query failed:', testError);
        return false;
      }

      console.log('[Token Sync] Token synchronized and RLS test passed');
      return true;
    } catch (error) {
      console.log('[Token Sync] Synchronization failed:', error);
      return false;
    }
  };

  // Create a new chat with connection-level auth validation and explicit client creation
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

    console.log('[Chat Creation] Starting connection-level validated chat creation...');

    try {
      // Get fresh session with explicit token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[Chat Creation] No valid session available');
        toast({
          title: "Error",
          description: "Authentication issue - please try refreshing the page",
          variant: "destructive",
        });
        return null;
      }

      console.log('[Chat Creation] Session available, creating dedicated client...');

      // Create a dedicated client with explicit auth headers for this operation
      const chatClient = createClient(
        'https://peqqefvohjemxhuyvzbg.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcXFlZnZvaGplbXhodXl2emJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjM1NjAsImV4cCI6MjA2ODkzOTU2MH0.YPJYJrYziXv8b3oy3kyDKnIuK4Gknl_iTP95I4OAO9o',
        {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
          },
          global: {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        }
      );

      // Test connection-level auth context before attempting to create
      console.log('[Chat Creation] Testing connection-level auth context...');
      const { data: authTest, error: authTestError } = await chatClient.rpc('auth_uid_test');
      
      if (authTestError || !authTest) {
        console.error('[Chat Creation] Connection-level auth test failed:', authTestError);
        toast({
          title: "Error", 
          description: "Authentication issue - please try refreshing the page",
          variant: "destructive",
        });
        return null;
      }

      console.log('[Chat Creation] Connection-level auth validated, creating chat...');

      // Create chat using the validated client with creator ownership
      const { data: chat, error: chatError } = await chatClient
        .from('chats')
        .insert({
          name,
          is_public: isPublic,
          trade_id: tradeId,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('[Chat Creation] Chat creation error:', chatError);
        toast({
          title: "Error",
          description: chatError.message?.includes('row-level security policy') 
            ? "Authentication issue - please try refreshing the page" 
            : "Failed to create chat",
          variant: "destructive",
        });
        return null;
      }

      console.log('[Chat Creation] Chat created successfully:', chat.id);

      // Add current user as participant using the same validated client
      const participantsToAdd = [user.id, ...participantIds].filter((id, index, arr) => 
        arr.indexOf(id) === index // Remove duplicates
      );

      console.log('[Chat Creation] Adding participants:', participantsToAdd);
      const { error: participantError } = await chatClient
        .from('chat_participants')
        .insert(
          participantsToAdd.map(userId => ({
            chat_id: chat.id,
            user_id: userId
          }))
        );

      if (participantError) {
        console.error('[Chat Creation] Participant creation error:', participantError);
        // If participants fail, clean up the chat using the same client
        await chatClient.from('chats').delete().eq('id', chat.id);
        toast({
          title: "Error",
          description: "Failed to add participants to chat",
          variant: "destructive",
        });
        return null;
      }

      console.log('[Chat Creation] Participants added successfully');
      
      toast({
        title: "Chat created",
        description: `Chat "${name}" has been created`,
      });

      return chat.id;
    } catch (error) {
      console.error('[Chat Creation] Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
      return null;
    }
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

    // Subscribe to chat changes - only listen to INSERT/DELETE to avoid loops
    const chatsChannel = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chats'
      }, () => {
        fetchChats(); // Refetch when new chats are created
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chats'
      }, () => {
        fetchChats(); // Refetch when chats are deleted
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