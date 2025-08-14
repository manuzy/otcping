import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Governance } from '@/types/dueDiligence';

export const useGovernance = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<Governance>>({
    institution_id: institutionId,
    three_lines_implemented: false,
    three_lines_description: '',
    compliance_officer: '',
    compliance_qualifications: '',
    compliance_reporting_line: '',
    risk_officer: '',
    risk_qualifications: '',
    risk_reporting_line: '',
    internal_audit_officer: '',
    internal_audit_qualifications: '',
    internal_audit_reporting_line: '',
    board_committees: [],
    core_policies: {
      risk_framework: false,
      compliance_manual: false,
      internal_audit_charter: false,
      conflicts_of_interest: false,
      remuneration: false,
      outsourcing: false,
      best_execution: false
    }
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

      const { data: governanceData, error: governanceError } = await supabase
        .from('institution_governance')
        .select('*')
        .eq('institution_id', institutionId)
        .single();

      if (governanceError && governanceError.code !== 'PGRST116') {
        throw governanceError;
      }

      if (governanceData) {
        setData({
          institution_id: governanceData.institution_id,
          three_lines_implemented: governanceData.three_lines_implemented || false,
          three_lines_description: governanceData.three_lines_description || '',
          compliance_officer: governanceData.compliance_officer || '',
          compliance_qualifications: governanceData.compliance_qualifications || '',
          compliance_reporting_line: governanceData.compliance_reporting_line || '',
          risk_officer: governanceData.risk_officer || '',
          risk_qualifications: governanceData.risk_qualifications || '',
          risk_reporting_line: governanceData.risk_reporting_line || '',
          internal_audit_officer: governanceData.internal_audit_officer || '',
          internal_audit_qualifications: governanceData.internal_audit_qualifications || '',
          internal_audit_reporting_line: governanceData.internal_audit_reporting_line || '',
          board_committees: (governanceData.board_committees as any) || [],
          core_policies: (governanceData.core_policies as any) || {}
        });
      }
    } catch (err) {
      console.error('Error loading governance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<Governance>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: governanceError } = await supabase
        .from('institution_governance')
        .upsert({
          institution_id: institutionId,
          three_lines_implemented: newData.three_lines_implemented || false,
          three_lines_description: newData.three_lines_description || null,
          compliance_officer: newData.compliance_officer || null,
          compliance_qualifications: newData.compliance_qualifications || null,
          compliance_reporting_line: newData.compliance_reporting_line || null,
          risk_officer: newData.risk_officer || null,
          risk_qualifications: newData.risk_qualifications || null,
          risk_reporting_line: newData.risk_reporting_line || null,
          internal_audit_officer: newData.internal_audit_officer || null,
          internal_audit_qualifications: newData.internal_audit_qualifications || null,
          internal_audit_reporting_line: newData.internal_audit_reporting_line || null,
          board_committees: JSON.stringify(newData.board_committees || []),
          core_policies: JSON.stringify(newData.core_policies || {})
        });

      if (governanceError) {
        throw governanceError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving governance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<Governance>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<Governance>) => {
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