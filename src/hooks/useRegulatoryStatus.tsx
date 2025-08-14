import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RegulatoryStatus } from '@/types/dueDiligence';

export const useRegulatoryStatus = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<RegulatoryStatus>>({
    institution_id: institutionId,
    primary_authority: '',
    license_number: '',
    license_categories: [],
    operating_jurisdictions: [],
    passporting_enabled: false,
    passporting_details: '',
    restrictions_conditions: '',
    public_register_urls: [],
    initial_issue_date: undefined,
    last_renewal_date: undefined,
    license_documents: []
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

      const { data: regulatoryData, error: regulatoryError } = await supabase
        .from('institution_regulatory_status')
        .select('*')
        .eq('institution_id', institutionId)
        .single();

      if (regulatoryError && regulatoryError.code !== 'PGRST116') {
        throw regulatoryError;
      }

      if (regulatoryData) {
        setData({
          institution_id: regulatoryData.institution_id,
          primary_authority: regulatoryData.primary_authority,
          license_number: regulatoryData.license_number,
          license_categories: regulatoryData.license_categories || [],
          operating_jurisdictions: regulatoryData.operating_jurisdictions || [],
          passporting_enabled: regulatoryData.passporting_enabled || false,
          passporting_details: regulatoryData.passporting_details || '',
          restrictions_conditions: regulatoryData.restrictions_conditions || '',
          public_register_urls: regulatoryData.public_register_urls || [],
          initial_issue_date: regulatoryData.initial_issue_date ? new Date(regulatoryData.initial_issue_date) : undefined,
          last_renewal_date: regulatoryData.last_renewal_date ? new Date(regulatoryData.last_renewal_date) : undefined,
          license_documents: (regulatoryData.license_documents as any) || []
        });
      }
    } catch (err) {
      console.error('Error loading regulatory status data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<RegulatoryStatus>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: regulatoryError } = await supabase
        .from('institution_regulatory_status')
        .upsert({
          institution_id: institutionId,
          primary_authority: newData.primary_authority || '',
          license_number: newData.license_number || '',
          license_categories: newData.license_categories || [],
          operating_jurisdictions: newData.operating_jurisdictions || [],
          passporting_enabled: newData.passporting_enabled || false,
          passporting_details: newData.passporting_details || null,
          restrictions_conditions: newData.restrictions_conditions || null,
          public_register_urls: newData.public_register_urls || [],
          initial_issue_date: newData.initial_issue_date?.toISOString().split('T')[0] || null,
          last_renewal_date: newData.last_renewal_date?.toISOString().split('T')[0] || null,
          license_documents: JSON.stringify(newData.license_documents || [])
        });

      if (regulatoryError) {
        throw regulatoryError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving regulatory status data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<RegulatoryStatus>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<RegulatoryStatus>) => {
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