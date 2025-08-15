import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

export const useSectionCompletion = (institutionId: string) => {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<Record<DueDiligenceSection, SectionCompletion>>({} as Record<DueDiligenceSection, SectionCompletion>);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load completion status for all sections
  const loadCompletions = useCallback(async () => {
    if (!institutionId || !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('institution_section_completion')
        .select('*')
        .eq('institution_id', institutionId);

      if (fetchError) {
        throw fetchError;
      }

      // Convert array to object keyed by section name
      const completionMap = data.reduce((acc, item) => {
        acc[item.section_name as DueDiligenceSection] = {
          institution_id: item.institution_id,
          section_name: item.section_name as DueDiligenceSection,
          is_completed: item.is_completed || false,
          completion_percentage: item.completion_percentage || 0,
          last_updated_at: new Date(item.last_updated_at || item.created_at)
        };
        return acc;
      }, {} as Record<DueDiligenceSection, SectionCompletion>);

      setCompletions(completionMap);
    } catch (err) {
      console.error('Error loading section completions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load completion status');
    } finally {
      setLoading(false);
    }
  }, [institutionId, user?.id]);

  // Update completion status for a specific section
  const updateCompletion = useCallback(async (sectionName: DueDiligenceSection, completion: SectionCompletion) => {
    if (!institutionId || !user?.id) return;

    try {
      const { error: upsertError } = await supabase
        .from('institution_section_completion')
        .upsert({
          institution_id: institutionId,
          section_name: sectionName,
          is_completed: completion.is_completed,
          completion_percentage: completion.completion_percentage,
          last_updated_at: new Date().toISOString()
        }, {
          onConflict: 'institution_id,section_name'
        });

      if (upsertError) {
        throw upsertError;
      }

      // Update local state
      setCompletions(prev => ({
        ...prev,
        [sectionName]: completion
      }));
    } catch (err) {
      console.error('Error updating section completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to update completion status');
      throw err;
    }
  }, [institutionId, user?.id]);

  // Calculate overall progress
  const overallProgress = useCallback(() => {
    const sections = Object.values(completions);
    if (sections.length === 0) return 0;
    
    const totalPercentage = sections.reduce((sum, section) => sum + (section.completion_percentage || 0), 0);
    return Math.round(totalPercentage / sections.length);
  }, [completions]);

  // Count completed sections
  const completedSections = useCallback(() => {
    return Object.values(completions).filter(section => section.is_completed).length;
  }, [completions]);

  // Get completion status for a specific section
  const getSectionCompletion = useCallback((sectionName: DueDiligenceSection) => {
    return completions[sectionName] || {
      institution_id: institutionId,
      section_name: sectionName,
      is_completed: false,
      completion_percentage: 0,
      last_updated_at: new Date()
    };
  }, [completions, institutionId]);

  // Load completions on mount
  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  return {
    completions,
    loading,
    error,
    updateCompletion,
    overallProgress: overallProgress(),
    completedSections: completedSections(),
    getSectionCompletion,
    reload: loadCompletions
  };
};