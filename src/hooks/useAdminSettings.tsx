import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsAdmin } from './useIsAdmin';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

interface AdminSettings {
  skip_approval: boolean;
  global_theme: string;
}

export function useAdminSettings() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [settings, setSettings] = useState<AdminSettings>({ skip_approval: false, global_theme: 'system' });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!adminLoading && user && isAdmin) {
      fetchSettings();
    } else if (!adminLoading) {
      setLoading(false);
    }
  }, [user, isAdmin, adminLoading]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('skip_approval, global_theme')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
        logger.error('Error fetching admin settings', {
          operation: 'fetch_admin_settings',
          userId: user?.id
        }, error as Error);
        return;
      }

      if (data) {
        setSettings({ 
          skip_approval: data.skip_approval,
          global_theme: data.global_theme || 'system'
        });
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      logger.error('Error in fetchSettings', {
        operation: 'fetch_admin_settings',
        userId: user?.id
      }, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .insert({
          user_id: user?.id,
          skip_approval: false,
          global_theme: 'system'
        });
      
      if (!error) {
        setSettings({ skip_approval: false, global_theme: 'system' });
      }

      if (error) {
        logger.error('Error creating default admin settings', {
          operation: 'create_default_admin_settings',
          userId: user?.id
        }, error as Error);
      }
    } catch (error) {
      logger.error('Error in createDefaultSettings', {
        operation: 'create_default_admin_settings',
        userId: user?.id
      }, error as Error);
    }
  };

  const updateSkipApproval = async (skipApproval: boolean) => {
    if (!user || !isAdmin || adminLoading) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          user_id: user.id,
          skip_approval: skipApproval,
          global_theme: settings.global_theme
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Error updating admin settings', {
          operation: 'update_admin_settings',
          userId: user.id,
          metadata: { skipApproval }
        }, error as Error);
        notifications.updateError('admin settings');
        return;
      }

      setSettings(prev => ({ ...prev, skip_approval: skipApproval }));
      notifications.updateSuccess('admin settings');
      logger.info('Admin settings updated successfully', {
        operation: 'update_admin_settings',
        userId: user.id,
        metadata: { skipApproval }
      });
    } catch (error) {
      logger.error('Error in updateSkipApproval', {
        operation: 'update_admin_settings',
        userId: user?.id,
        metadata: { skipApproval }
      }, error as Error);
      notifications.updateError('admin settings');
    } finally {
      setUpdating(false);
    }
  };

  const updateGlobalTheme = async (theme: string) => {
    if (!user || !isAdmin || adminLoading) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          user_id: user.id,
          skip_approval: settings.skip_approval,
          global_theme: theme
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Error updating global theme', {
          operation: 'update_global_theme',
          userId: user.id,
          metadata: { theme }
        }, error as Error);
        notifications.updateError('global theme');
        return;
      }

      setSettings(prev => ({ ...prev, global_theme: theme }));
      notifications.updateSuccess('global theme');
      
      // Dispatch custom event to notify theme provider
      window.dispatchEvent(new CustomEvent('globalThemeChanged', { detail: theme }));
      
      logger.info('Global theme updated successfully', {
        operation: 'update_global_theme',
        userId: user.id,
        metadata: { theme }
      });
    } catch (error) {
      logger.error('Error in updateGlobalTheme', {
        operation: 'update_global_theme',
        userId: user?.id,
        metadata: { theme }
      }, error as Error);
      notifications.updateError('global theme');
    } finally {
      setUpdating(false);
    }
  };

  return {
    settings,
    loading,
    updating,
    updateSkipApproval,
    updateGlobalTheme,
    refreshSettings: fetchSettings
  };
}