import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { License } from '@/types';
import { logger } from '@/lib/logger';

export function useLicenses() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('data_licenses')
        .select('*')
        .order('region_code', { ascending: true })
        .order('license_name', { ascending: true });

      if (error) throw error;

      const formattedLicenses: License[] = (data || []).map(license => ({
        id: license.id,
        regionCode: license.region_code,
        region: license.region,
        licenseName: license.license_name,
        description: license.description,
      }));

      setLicenses(formattedLicenses);
    } catch (err) {
      logger.error('Error fetching licenses', {
        component: 'useLicenses',
        operation: 'fetch_licenses'
      }, err as Error);
      setError('Failed to fetch licenses');
    } finally {
      setLoading(false);
    }
  };

  return { licenses, loading, error, refetch: fetchLicenses };
}