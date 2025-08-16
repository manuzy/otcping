import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChatFolder, ChatFolderAssignment } from '@/types/chat';
import { notifications } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export const useChatFolders = () => {
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [assignments, setAssignments] = useState<ChatFolderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: foldersData, error: foldersError } = await supabase
        .from('chat_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (foldersError) throw foldersError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('chat_folder_assignments')
        .select('*')
        .eq('user_id', user.id);

      if (assignmentsError) throw assignmentsError;

      setFolders(foldersData.map(folder => ({
        id: folder.id,
        userId: folder.user_id,
        name: folder.name,
        color: folder.color || 'hsl(var(--primary))',
        position: folder.position || 0,
        createdAt: new Date(folder.created_at),
        updatedAt: new Date(folder.updated_at)
      })));

      setAssignments(assignmentsData.map(assignment => ({
        id: assignment.id,
        chatId: assignment.chat_id,
        folderId: assignment.folder_id,
        userId: assignment.user_id,
        createdAt: new Date(assignment.created_at)
      })));
    } catch (error) {
      logger.error('Failed to fetch chat folders', {}, error as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createFolder = useCallback(async (name: string, color: string = 'hsl(var(--primary))'): Promise<ChatFolder | null> => {
    if (!user || !name.trim()) return null;

    try {
      const maxPosition = Math.max(...folders.map(f => f.position), -1);
      
      const { data, error } = await supabase
        .from('chat_folders')
        .insert({
          user_id: user.id,
          name: name.trim(),
          color,
          position: maxPosition + 1
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: ChatFolder = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        color: data.color || 'hsl(var(--primary))',
        position: data.position || 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setFolders(prev => [...prev, newFolder]);
      notifications.success({ description: `Folder "${name}" created` });
      
      return newFolder;
    } catch (error) {
      logger.error('Failed to create folder', { name }, error as Error);
      notifications.error({ description: 'Failed to create folder' });
      return null;
    }
  }, [user, folders]);

  const updateFolder = useCallback(async (folderId: string, updates: Partial<ChatFolder>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_folders')
        .update({
          name: updates.name,
          color: updates.color,
          position: updates.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFolders(prev => prev.map(folder => 
        folder.id === folderId 
          ? { ...folder, ...updates, updatedAt: new Date() }
          : folder
      ));

      notifications.success({ description: 'Folder updated' });
      return true;
    } catch (error) {
      logger.error('Failed to update folder', { folderId }, error as Error);
      notifications.error({ description: 'Failed to update folder' });
      return false;
    }
  }, [user]);

  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;

      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      setAssignments(prev => prev.filter(assignment => assignment.folderId !== folderId));
      
      notifications.success({ description: 'Folder deleted' });
      return true;
    } catch (error) {
      logger.error('Failed to delete folder', { folderId }, error as Error);
      notifications.error({ description: 'Failed to delete folder' });
      return false;
    }
  }, [user]);

  const assignChatToFolder = useCallback(async (chatId: string, folderId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_folder_assignments')
        .upsert({
          chat_id: chatId,
          folder_id: folderId,
          user_id: user.id
        });

      if (error) throw error;

      const newAssignment: ChatFolderAssignment = {
        id: '', // Will be set by DB
        chatId,
        folderId,
        userId: user.id,
        createdAt: new Date()
      };

      setAssignments(prev => [
        ...prev.filter(a => a.chatId !== chatId),
        newAssignment
      ]);

      return true;
    } catch (error) {
      logger.error('Failed to assign chat to folder', { chatId, folderId }, error as Error);
      return false;
    }
  }, [user]);

  const removeChatFromFolder = useCallback(async (chatId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_folder_assignments')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAssignments(prev => prev.filter(assignment => assignment.chatId !== chatId));
      return true;
    } catch (error) {
      logger.error('Failed to remove chat from folder', { chatId }, error as Error);
      return false;
    }
  }, [user]);

  const getChatFolder = useCallback((chatId: string): ChatFolder | null => {
    const assignment = assignments.find(a => a.chatId === chatId);
    if (!assignment) return null;
    return folders.find(f => f.id === assignment.folderId) || null;
  }, [assignments, folders]);

  // Initial fetch
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return {
    folders,
    assignments,
    loading,
    createFolder,
    updateFolder,
    deleteFolder,
    assignChatToFolder,
    removeChatFromFolder,
    getChatFolder,
    refetch: fetchFolders
  };
};