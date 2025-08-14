import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Financials } from '@/types/dueDiligence';

export const useFinancials = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<Financials>>({
    institution_id: institutionId,
    regulatory_capital_amount: undefined,
    regulatory_capital_currency: '',
    minimum_capital_requirement: undefined,
    capital_requirement_currency: '',
    as_of_date: undefined,
    current_ratio: undefined,
    quick_ratio: undefined,
    auditor_name: '',
    auditor_regulation: '',
    audit_opinion: undefined,
    financial_statements: [],
    insurance_details: {}
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

      const { data: financialsData, error: financialsError } = await supabase
        .from('institution_financials')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (financialsError) {
        throw financialsError;
      }

      if (financialsData) {
        setData({
          institution_id: financialsData.institution_id,
          regulatory_capital_amount: financialsData.regulatory_capital_amount || undefined,
          regulatory_capital_currency: financialsData.regulatory_capital_currency || '',
          minimum_capital_requirement: financialsData.minimum_capital_requirement || undefined,
          capital_requirement_currency: financialsData.capital_requirement_currency || '',
          as_of_date: financialsData.as_of_date ? new Date(financialsData.as_of_date) : undefined,
          current_ratio: financialsData.current_ratio || undefined,
          quick_ratio: financialsData.quick_ratio || undefined,
          auditor_name: financialsData.auditor_name || '',
          auditor_regulation: financialsData.auditor_regulation || '',
          audit_opinion: financialsData.audit_opinion as any || undefined,
          financial_statements: (financialsData.financial_statements as any) || [],
          insurance_details: (financialsData.insurance_details as any) || {}
        });
      }
    } catch (err) {
      console.error('Error loading financials data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<Financials>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: financialsError } = await supabase
        .from('institution_financials')
        .upsert({
          institution_id: institutionId,
          regulatory_capital_amount: newData.regulatory_capital_amount || null,
          regulatory_capital_currency: newData.regulatory_capital_currency || null,
          minimum_capital_requirement: newData.minimum_capital_requirement || null,
          capital_requirement_currency: newData.capital_requirement_currency || null,
          as_of_date: newData.as_of_date?.toISOString().split('T')[0] || null,
          current_ratio: newData.current_ratio || null,
          quick_ratio: newData.quick_ratio || null,
          auditor_name: newData.auditor_name || null,
          auditor_regulation: newData.auditor_regulation || null,
          audit_opinion: newData.audit_opinion || null,
          financial_statements: JSON.stringify(newData.financial_statements || []),
          insurance_details: JSON.stringify(newData.insurance_details || {})
        });

      if (financialsError) {
        throw financialsError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving financials data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<Financials>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<Financials>) => {
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