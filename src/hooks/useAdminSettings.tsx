import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsAdmin } from './useIsAdmin';
import { toast } from 'sonner';

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
        console.error('Error fetching admin settings:', error);
        return;
      }

      if (data) {
        setSettings({ skip_approval: data.skip_approval });
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
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
        console.error('Error creating default admin settings:', error);
      }
    } catch (error) {
      console.error('Error in createDefaultSettings:', error);
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
        toast.error('Failed to update settings');
        console.error('Error updating admin settings:', error);
        return;
      }

      setSettings(prev => ({ ...prev, skip_approval: skipApproval }));
      toast.success(`Skip approval ${skipApproval ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update settings');
      console.error('Error in updateSkipApproval:', error);
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