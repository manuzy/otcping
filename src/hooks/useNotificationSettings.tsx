import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

interface NotificationSettings {
  id?: string;
  user_id: string;
  email?: string;
  enable_email: boolean;
  enable_telegram: boolean;
  enable_slack: boolean;
  enable_sms: boolean;
  email_frequency: 'all' | 'first_only';
}

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // Fetch notification settings
  const fetchSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings({
          ...data,
          email_frequency: (data.email_frequency as 'all' | 'first_only') || 'first_only'
        });
      } else {
        // Create default settings if none exist
        const defaultSettings: NotificationSettings = {
          user_id: user.id,
          email: '',
          enable_email: false,
          enable_telegram: false,
          enable_slack: false,
          enable_sms: false,
          email_frequency: 'first_only',
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      logger.error('Error fetching notification settings', {
        component: 'useNotificationSettings',
        operation: 'fetch_settings',
        userId: user?.id
      }, error as Error);
      notifications.loadingError('notification settings');
    } finally {
      setLoading(false);
    }
  };

  // Save notification settings
  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user?.id || !settings) return;

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('notification_settings')
          .update(updatedSettings)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('notification_settings')
          .insert([updatedSettings])
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      setSettings(updatedSettings);
      notifications.saveSuccess('notification settings');
    } catch (error) {
      logger.error('Error saving notification settings', {
        component: 'useNotificationSettings',
        operation: 'save_settings',
        userId: user?.id
      }, error as Error);
      notifications.saveError('notification settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
  };
};