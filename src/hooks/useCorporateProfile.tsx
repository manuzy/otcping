import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { CorporateProfile, Contact, OwnershipEntry } from '@/types/dueDiligence';

interface CorporateProfileData {
  profile: Partial<CorporateProfile>;
  contacts: Contact[];
  ownership: OwnershipEntry[];
}

export const useCorporateProfile = (institutionId: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<CorporateProfileData>({
    profile: {
      institution_id: institutionId,
      legal_name: '',
      trading_name: '',
      lei: '',
      legal_form: '',
      registration_number: '',
      registry_name: '',
      incorporation_date: undefined,
      incorporation_country: '',
      principal_address: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      },
      website: '',
      organizational_chart_url: ''
    },
    contacts: [{
      role: 'Compliance Officer',
      name: '',
      email: '',
      phone: ''
    }],
    ownership: []
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

      // Load corporate profile
      const { data: profileData, error: profileError } = await supabase
        .from('institution_corporate_profile')
        .select('*')
        .eq('institution_id', institutionId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('institution_contacts')
        .select('*')
        .eq('institution_id', institutionId);

      if (contactsError) {
        throw contactsError;
      }

      // Load ownership
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('institution_ownership')
        .select('*')
        .eq('institution_id', institutionId);

      if (ownershipError) {
        throw ownershipError;
      }

      // Update state with loaded data
      setData({
        profile: profileData ? {
          institution_id: profileData.institution_id,
          legal_name: profileData.legal_name,
          trading_name: profileData.trading_name || '',
          lei: profileData.lei || '',
          legal_form: profileData.legal_form || '',
          registration_number: profileData.registration_number,
          registry_name: profileData.registry_name,
          incorporation_date: profileData.incorporation_date ? new Date(profileData.incorporation_date) : undefined,
          incorporation_country: profileData.incorporation_country || '',
          principal_address: typeof profileData.principal_address === 'object' ? 
            profileData.principal_address as any : {
              street: '',
              city: '',
              state: '',
              postal_code: '',
              country: ''
            },
          website: profileData.website || '',
          organizational_chart_url: profileData.organizational_chart_url || ''
        } : data.profile,
        contacts: contactsData.length > 0 ? contactsData.map(contact => ({
          role: contact.role as Contact['role'],
          name: contact.name,
          email: contact.email,
          phone: contact.phone || ''
        })) : data.contacts,
        ownership: ownershipData.map(item => ({
          holder_name: item.holder_name,
          holder_type: item.holder_type === 'individual' ? 'natural_person' : 'legal_entity' as OwnershipEntry['holder_type'],
          country: item.country || '',
          nationality: item.nationality || '',
          residency: item.residency || '',
          percentage: Number(item.percentage),
          is_ubo: item.is_ubo || false,
          date_of_birth: item.date_of_birth ? new Date(item.date_of_birth) : undefined,
          documents: (item.documents as any) || []
        }))
      });
    } catch (err) {
      console.error('Error loading corporate profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Save data to database
  const saveData = useCallback(async (newData: CorporateProfileData) => {
    if (!institutionId || !user?.id) {
      throw new Error('Missing institution ID or user');
    }

    try {
      setSaving(true);
      setError(null);

      // Save corporate profile
      const { error: profileError } = await supabase
        .from('institution_corporate_profile')
        .upsert({
          institution_id: institutionId,
          legal_name: newData.profile.legal_name || '',
          trading_name: newData.profile.trading_name || null,
          lei: newData.profile.lei || null,
          legal_form: newData.profile.legal_form || null,
          registration_number: newData.profile.registration_number || '',
          registry_name: newData.profile.registry_name || '',
          incorporation_date: newData.profile.incorporation_date?.toISOString().split('T')[0] || null,
          incorporation_country: newData.profile.incorporation_country || null,
          principal_address: JSON.stringify(newData.profile.principal_address || {}),
          website: newData.profile.website || null,
          organizational_chart_url: newData.profile.organizational_chart_url || null
        });

      if (profileError) {
        throw profileError;
      }

      // Delete existing contacts and ownership to replace with new data
      await supabase
        .from('institution_contacts')
        .delete()
        .eq('institution_id', institutionId);

      await supabase
        .from('institution_ownership')
        .delete()
        .eq('institution_id', institutionId);

      // Save contacts
      if (newData.contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from('institution_contacts')
          .insert(newData.contacts.map(contact => ({
            institution_id: institutionId,
            role: contact.role,
            name: contact.name,
            email: contact.email,
            phone: contact.phone || null
          })));

        if (contactsError) {
          throw contactsError;
        }
      }

      // Save ownership
      if (newData.ownership.length > 0) {
        const { error: ownershipError } = await supabase
          .from('institution_ownership')
          .insert(newData.ownership.map(item => ({
            institution_id: institutionId,
            holder_name: item.holder_name,
            holder_type: item.holder_type === 'natural_person' ? 'individual' : 'legal_entity',
            country: item.country || null,
            nationality: item.nationality || null,
            residency: item.residency || null,
            percentage: item.percentage,
            is_ubo: item.is_ubo || false,
            date_of_birth: item.date_of_birth?.toISOString().split('T')[0] || null,
            documents: JSON.stringify(item.documents || [])
          })));

        if (ownershipError) {
          throw ownershipError;
        }
      }

      // Update local state
      setData(newData);
    } catch (err) {
      console.error('Error saving corporate profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [institutionId, user?.id]);

  // Auto-save with debouncing
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const autoSave = useCallback((newData: CorporateProfileData) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      saveData(newData).catch(console.error);
    }, 2000); // Save 2 seconds after user stops typing

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveData]);

  // Update data and trigger auto-save
  const updateData = useCallback((newData: Partial<CorporateProfileData>) => {
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