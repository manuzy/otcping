import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Declarations } from '@/types/dueDiligence';

export const useDeclarations = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<Declarations>>({
    institution_id: institutionId,
    information_truthful_complete: false,
    notification_obligation_accepted: false,
    notification_days_limit: 30,
    signature_level: undefined,
    signer_name: '',
    signer_role: '',
    signer_title: '',
    signature_place: '',
    signature_date: undefined
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

      const { data: declarationsData, error: declarationsError } = await supabase
        .from('institution_declarations')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (declarationsError) {
        throw declarationsError;
      }

      if (declarationsData) {
        setData({
          institution_id: declarationsData.institution_id,
          information_truthful_complete: declarationsData.information_truthful_complete || false,
          notification_obligation_accepted: declarationsData.notification_obligation_accepted || false,
          notification_days_limit: declarationsData.notification_days_limit || 30,
          signature_level: declarationsData.signature_level as any || undefined,
          signer_name: declarationsData.signer_name || '',
          signer_role: declarationsData.signer_role || '',
          signer_title: declarationsData.signer_title || '',
          signature_place: declarationsData.signature_place || '',
          signature_date: declarationsData.signature_date ? new Date(declarationsData.signature_date) : undefined
        });
      }
    } catch (err) {
      console.error('Error loading declarations data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<Declarations>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: declarationsError } = await supabase
        .from('institution_declarations')
        .upsert({
          institution_id: institutionId,
          information_truthful_complete: newData.information_truthful_complete || false,
          notification_obligation_accepted: newData.notification_obligation_accepted || false,
          notification_days_limit: newData.notification_days_limit || 30,
          signature_level: newData.signature_level || null,
          signer_name: newData.signer_name || null,
          signer_role: newData.signer_role || null,
          signer_title: newData.signer_title || null,
          signature_place: newData.signature_place || null,
          signature_date: newData.signature_date?.toISOString() || null
        });

      if (declarationsError) {
        throw declarationsError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving declarations data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<Declarations>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<Declarations>) => {
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