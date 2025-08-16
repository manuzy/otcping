import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageDraft {
  id: string;
  chatId: string;
  content: string;
  mentions: string[];
  updatedAt: Date;
}

export const useMessageDrafts = (chatId: string) => {
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDraft = useCallback(async () => {
    if (!chatId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_drafts')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading draft:', error);
        return;
      }

      if (data) {
        setDraft({
          id: data.id,
          chatId: data.chat_id,
          content: data.content,
          mentions: data.mentions || [],
          updatedAt: new Date(data.updated_at),
        });
      }
    } catch (error) {
      console.error('Unexpected error loading draft:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const saveDraft = useCallback(async (content: string, mentions: string[] = []) => {
    if (!chatId || !content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_drafts')
        .upsert({
          chat_id: chatId,
          user_id: user.id,
          content: content.trim(),
          mentions,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving draft:', error);
        return;
      }

      setDraft({
        id: data.id,
        chatId: data.chat_id,
        content: data.content,
        mentions: data.mentions || [],
        updatedAt: new Date(data.updated_at),
      });
    } catch (error) {
      console.error('Unexpected error saving draft:', error);
    }
  }, [chatId]);

  const clearDraft = useCallback(async () => {
    if (!chatId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('message_drafts')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing draft:', error);
        return;
      }

      setDraft(null);
    } catch (error) {
      console.error('Unexpected error clearing draft:', error);
    }
  }, [chatId]);

  const updateDraftContent = useCallback((content: string, mentions: string[] = []) => {
    if (draft) {
      setDraft({
        ...draft,
        content,
        mentions,
        updatedAt: new Date(),
      });
    }
  }, [draft]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Auto-save draft after a delay
  useEffect(() => {
    if (!draft?.content) return;

    const timeoutId = setTimeout(() => {
      saveDraft(draft.content, draft.mentions);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [draft?.content, draft?.mentions, saveDraft]);

  return {
    draft,
    loading,
    saveDraft,
    clearDraft,
    updateDraftContent,
    refetch: loadDraft,
  };
};