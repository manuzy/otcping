import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsAdmin } from './useIsAdmin';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

interface AdminSettings {
  skip_approval: boolean;
}

export function useAdminSettings() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [settings, setSettings] = useState<AdminSettings>({ skip_approval: false });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('skip_approval')
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
        setSettings({ skip_approval: data.skip_approval });
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
          skip_approval: false
        });

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
    if (!user || !isAdmin) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          user_id: user.id,
          skip_approval: skipApproval
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

  return {
    settings,
    loading,
    updating,
    updateSkipApproval,
    refreshSettings: fetchSettings
  };
}