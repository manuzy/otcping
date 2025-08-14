import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { AMLProgram } from '@/types/dueDiligence';

export const useAMLProgram = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<AMLProgram>>({
    institution_id: institutionId,
    aml_policy_url: '',
    screening_tools: [],
    sanctions_lists: [],
    risk_assessment_methodology: '',
    kyc_onboarding_checklist: '',
    periodic_review_cycle: '',
    expected_products_volumes: '',
    client_types: [],
    geographic_exposure: [],
    source_of_funds_wealth: '',
    pep_screening_enabled: false,
    kyt_monitoring_tool: '',
    kyt_rule_coverage: '',
    kyt_alert_handling: '',
    kyt_thresholds: {},
    travel_rule_provider: '',
    travel_rule_message_standard: '',
    travel_rule_coverage_jurisdictions: [],
    retention_periods: {},
    mlro_contact_id: '',
    authorized_signatories: [],
    ubo_evidence_documents: []
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

      const { data: amlData, error: amlError } = await supabase
        .from('institution_aml_program')
        .select('*')
        .eq('institution_id', institutionId)
        .single();

      if (amlError && amlError.code !== 'PGRST116') {
        throw amlError;
      }

      if (amlData) {
        setData({
          institution_id: amlData.institution_id,
          aml_policy_url: amlData.aml_policy_url || '',
          screening_tools: amlData.screening_tools || [],
          sanctions_lists: amlData.sanctions_lists || [],
          risk_assessment_methodology: amlData.risk_assessment_methodology || '',
          kyc_onboarding_checklist: amlData.kyc_onboarding_checklist || '',
          periodic_review_cycle: amlData.periodic_review_cycle || '',
          expected_products_volumes: amlData.expected_products_volumes || '',
          client_types: amlData.client_types || [],
          geographic_exposure: amlData.geographic_exposure || [],
          source_of_funds_wealth: amlData.source_of_funds_wealth || '',
          pep_screening_enabled: amlData.pep_screening_enabled || false,
          kyt_monitoring_tool: amlData.kyt_monitoring_tool || '',
          kyt_rule_coverage: amlData.kyt_rule_coverage || '',
          kyt_alert_handling: amlData.kyt_alert_handling || '',
          kyt_thresholds: (amlData.kyt_thresholds as any) || {},
          travel_rule_provider: amlData.travel_rule_provider || '',
          travel_rule_message_standard: amlData.travel_rule_message_standard || '',
          travel_rule_coverage_jurisdictions: amlData.travel_rule_coverage_jurisdictions || [],
          retention_periods: (amlData.retention_periods as any) || {},
          mlro_contact_id: amlData.mlro_contact_id || '',
          authorized_signatories: (amlData.authorized_signatories as any) || [],
          ubo_evidence_documents: (amlData.ubo_evidence_documents as any) || []
        });
      }
    } catch (err) {
      console.error('Error loading AML program data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<AMLProgram>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: amlError } = await supabase
        .from('institution_aml_program')
        .upsert({
          institution_id: institutionId,
          aml_policy_url: newData.aml_policy_url || null,
          screening_tools: newData.screening_tools || [],
          sanctions_lists: newData.sanctions_lists || [],
          risk_assessment_methodology: newData.risk_assessment_methodology || null,
          kyc_onboarding_checklist: newData.kyc_onboarding_checklist || null,
          periodic_review_cycle: newData.periodic_review_cycle || null,
          expected_products_volumes: newData.expected_products_volumes || null,
          client_types: newData.client_types || [],
          geographic_exposure: newData.geographic_exposure || [],
          source_of_funds_wealth: newData.source_of_funds_wealth || null,
          pep_screening_enabled: newData.pep_screening_enabled || false,
          kyt_monitoring_tool: newData.kyt_monitoring_tool || null,
          kyt_rule_coverage: newData.kyt_rule_coverage || null,
          kyt_alert_handling: newData.kyt_alert_handling || null,
          kyt_thresholds: JSON.stringify(newData.kyt_thresholds || {}),
          travel_rule_provider: newData.travel_rule_provider || null,
          travel_rule_message_standard: newData.travel_rule_message_standard || null,
          travel_rule_coverage_jurisdictions: newData.travel_rule_coverage_jurisdictions || [],
          retention_periods: JSON.stringify(newData.retention_periods || {}),
          mlro_contact_id: newData.mlro_contact_id || null,
          authorized_signatories: JSON.stringify(newData.authorized_signatories || []),
          ubo_evidence_documents: JSON.stringify(newData.ubo_evidence_documents || [])
        });

      if (amlError) {
        throw amlError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving AML program data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<AMLProgram>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<AMLProgram>) => {
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