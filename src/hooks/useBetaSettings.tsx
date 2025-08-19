import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BetaSettings {
  id: string;
  is_beta_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBetaSettings() {
  const [settings, setSettings] = useState<BetaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('beta_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettings(data || { id: '', is_beta_active: false, created_at: '', updated_at: '' });
    } catch (error) {
      console.error('Error fetching beta settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch beta settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBetaStatus = async (isActive: boolean) => {
    if (!settings) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('beta_settings')
        .update({ is_beta_active: isActive })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, is_beta_active: isActive } : null);
      
      toast({
        title: "Success",
        description: `Beta phase ${isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      console.error('Error updating beta settings:', error);
      toast({
        title: "Error",
        description: "Failed to update beta settings",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updating,
    updateBetaStatus,
    refetch: fetchSettings
  };
}