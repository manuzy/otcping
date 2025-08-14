import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Operations } from '@/types/dueDiligence';

export const useOperations = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<Operations>>({
    institution_id: institutionId,
    it_operating_model: undefined,
    primary_providers: [],
    data_residency_locations: [],
    security_certifications: [],
    access_model: undefined,
    last_pentest_date: undefined,
    bcp_rto_minutes: undefined,
    bcp_rpo_minutes: undefined,
    last_bcp_test_date: undefined,
    bcp_test_results: '',
    emergency_contacts: [],
    regulatory_reporting_supported: false,
    reporting_interfaces: [],
    outsourcing_arrangements: []
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

      const { data: operationsData, error: operationsError } = await supabase
        .from('institution_operations')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (operationsError) {
        throw operationsError;
      }

      if (operationsData) {
        setData({
          institution_id: operationsData.institution_id,
          it_operating_model: operationsData.it_operating_model as any || undefined,
          primary_providers: operationsData.primary_providers || [],
          data_residency_locations: operationsData.data_residency_locations || [],
          security_certifications: operationsData.security_certifications || [],
          access_model: operationsData.access_model as any || undefined,
          last_pentest_date: operationsData.last_pentest_date ? new Date(operationsData.last_pentest_date) : undefined,
          bcp_rto_minutes: operationsData.bcp_rto_minutes || undefined,
          bcp_rpo_minutes: operationsData.bcp_rpo_minutes || undefined,
          last_bcp_test_date: operationsData.last_bcp_test_date ? new Date(operationsData.last_bcp_test_date) : undefined,
          bcp_test_results: operationsData.bcp_test_results || '',
          emergency_contacts: (operationsData.emergency_contacts as any) || [],
          regulatory_reporting_supported: operationsData.regulatory_reporting_supported || false,
          reporting_interfaces: operationsData.reporting_interfaces || [],
          outsourcing_arrangements: (operationsData.outsourcing_arrangements as any) || []
        });
      }
    } catch (err) {
      console.error('Error loading operations data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<Operations>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: operationsError } = await supabase
        .from('institution_operations')
        .upsert({
          institution_id: institutionId,
          it_operating_model: newData.it_operating_model || null,
          primary_providers: newData.primary_providers || [],
          data_residency_locations: newData.data_residency_locations || [],
          security_certifications: newData.security_certifications || [],
          access_model: newData.access_model || null,
          last_pentest_date: newData.last_pentest_date?.toISOString().split('T')[0] || null,
          bcp_rto_minutes: newData.bcp_rto_minutes || null,
          bcp_rpo_minutes: newData.bcp_rpo_minutes || null,
          last_bcp_test_date: newData.last_bcp_test_date?.toISOString().split('T')[0] || null,
          bcp_test_results: newData.bcp_test_results || null,
          emergency_contacts: JSON.stringify(newData.emergency_contacts || []),
          regulatory_reporting_supported: newData.regulatory_reporting_supported || false,
          reporting_interfaces: newData.reporting_interfaces || [],
          outsourcing_arrangements: JSON.stringify(newData.outsourcing_arrangements || [])
        });

      if (operationsError) {
        throw operationsError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving operations data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<Operations>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<Operations>) => {
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