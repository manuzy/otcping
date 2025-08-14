import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { LegalStatus } from '@/types/dueDiligence';

export const useLegalStatus = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<LegalStatus>>({
    institution_id: institutionId,
    litigation_investigations: [],
    regulatory_actions: [],
    adverse_media_method: '',
    adverse_media_check_date: undefined,
    adverse_media_summary: '',
    adverse_media_report_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing data
  const loadData = useCallback(async () => {
    if (!institutionId || !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: legalData, error: legalError } = await supabase
        .from('institution_legal_status')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (legalError) {
        throw legalError;
      }

      if (legalData) {
        setData({
          institution_id: legalData.institution_id,
          litigation_investigations: (legalData.litigation_investigations as any) || [],
          regulatory_actions: (legalData.regulatory_actions as any) || [],
          adverse_media_method: legalData.adverse_media_method || '',
          adverse_media_check_date: legalData.adverse_media_check_date ? new Date(legalData.adverse_media_check_date) : undefined,
          adverse_media_summary: legalData.adverse_media_summary || '',
          adverse_media_report_url: legalData.adverse_media_report_url || ''
        });
      }
    } catch (err) {
      console.error('Error loading legal status data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<LegalStatus>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: legalError } = await supabase
        .from('institution_legal_status')
        .upsert({
          institution_id: institutionId,
          litigation_investigations: JSON.stringify(newData.litigation_investigations || []),
          regulatory_actions: JSON.stringify(newData.regulatory_actions || []),
          adverse_media_method: newData.adverse_media_method || null,
          adverse_media_check_date: newData.adverse_media_check_date?.toISOString().split('T')[0] || null,
          adverse_media_summary: newData.adverse_media_summary || null,
          adverse_media_report_url: newData.adverse_media_report_url || null
        });

      if (legalError) {
        throw legalError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving legal status data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<LegalStatus>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<LegalStatus>) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    autoSave(updatedData);
  }, [data, autoSave]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    data,
    loading,
    saving,
    error,
    updateData,
    saveData,
    reload: loadData
  };
};