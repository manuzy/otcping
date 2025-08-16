import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notifications } from '@/lib/notifications';

interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const useMessageTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Supabase error fetching templates:', error);
        // If table doesn't exist, just set empty array and don't show error
        if (error.message?.includes('relation "message_templates" does not exist')) {
          console.warn('message_templates table does not exist yet');
          setTemplates([]);
          return;
        }
        throw error;
      }

      const transformedTemplates = data?.map(template => ({
        id: template.id,
        userId: template.user_id,
        name: template.name,
        content: template.content,
        category: template.category,
        variables: Array.isArray(template.variables) ? template.variables.filter(v => typeof v === 'string') : [],
        isPublic: template.is_public,
        usageCount: template.usage_count,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
      })) || [];

      setTemplates(transformedTemplates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
      
      // Don't show notifications for missing table errors
      if (!error?.message?.includes('relation "message_templates" does not exist')) {
        notifications.error({ description: 'Failed to load templates' });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTemplate = async (
    template: Pick<MessageTemplate, 'name' | 'content' | 'category' | 'variables' | 'isPublic'>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          name: template.name,
          content: template.content,
          category: template.category,
          variables: template.variables,
          is_public: template.isPublic,
        });

      if (error) throw error;

      notifications.success({ description: 'Template created successfully' });
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error creating template:', error);
      notifications.error({ description: 'Failed to create template' });
      return false;
    }
  };

  const updateTemplate = async (
    templateId: string,
    updates: Partial<Pick<MessageTemplate, 'name' | 'content' | 'category' | 'variables' | 'isPublic'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.content) updateData.content = updates.content;
      if (updates.category) updateData.category = updates.category;
      if (updates.variables) updateData.variables = updates.variables;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;

      const { error } = await supabase
        .from('message_templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) throw error;

      notifications.success({ description: 'Template updated successfully' });
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      notifications.error({ description: 'Failed to update template' });
      return false;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      notifications.success({ description: 'Template deleted successfully' });
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      notifications.error({ description: 'Failed to delete template' });
      return false;
    }
  };

  const useTemplate = async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ usage_count: templates.find(t => t.id === templateId)?.usageCount + 1 || 1 })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template usage:', error);
      return false;
    }
  };

  const parseTemplate = (content: string, variables: Record<string, string>): string => {
    let parsedContent = content;
    
    // Replace variables in format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      parsedContent = parsedContent.replace(regex, value);
    });

    return parsedContent;
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    parseTemplate,
    refetch: fetchTemplates,
  };
};