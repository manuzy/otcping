import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { TradingProfile } from '@/types/dueDiligence';

export const useTradingProfile = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<Partial<TradingProfile>>({
    institution_id: institutionId,
    asset_classes: [],
    venues_methods: [],
    best_execution_policy_url: '',
    settlement_methods: [],
    custody_model: '',
    counterparties: [],
    collateral_practices: '',
    custodians: [],
    rehypothecation_policy: '',
    conflict_management_description: '',
    conflict_policy_url: ''
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

      const { data: tradingData, error: tradingError } = await supabase
        .from('institution_trading_profile')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (tradingError) {
        throw tradingError;
      }

      if (tradingData) {
        setData({
          institution_id: tradingData.institution_id,
          asset_classes: tradingData.asset_classes || [],
          venues_methods: tradingData.venues_methods || [],
          best_execution_policy_url: tradingData.best_execution_policy_url || '',
          settlement_methods: tradingData.settlement_methods || [],
          custody_model: tradingData.custody_model || '',
          counterparties: tradingData.counterparties || [],
          collateral_practices: tradingData.collateral_practices || '',
          custodians: tradingData.custodians || [],
          rehypothecation_policy: tradingData.rehypothecation_policy || '',
          conflict_management_description: tradingData.conflict_management_description || '',
          conflict_policy_url: tradingData.conflict_policy_url || ''
        });
      }
    } catch (err) {
      console.error('Error loading trading profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: Partial<TradingProfile>) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      const { error: tradingError } = await supabase
        .from('institution_trading_profile')
        .upsert({
          institution_id: institutionId,
          asset_classes: newData.asset_classes || [],
          venues_methods: newData.venues_methods || [],
          best_execution_policy_url: newData.best_execution_policy_url || null,
          settlement_methods: newData.settlement_methods || [],
          custody_model: newData.custody_model || null,
          counterparties: newData.counterparties || [],
          collateral_practices: newData.collateral_practices || null,
          custodians: newData.custodians || [],
          rehypothecation_policy: newData.rehypothecation_policy || null,
          conflict_management_description: newData.conflict_management_description || null,
          conflict_policy_url: newData.conflict_policy_url || null
        });

      if (tradingError) {
        throw tradingError;
      }

      setData(newData);
    } catch (err) {
      console.error('Error saving trading profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: Partial<TradingProfile>) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<TradingProfile>) => {
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