import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAMLProgram } from '@/hooks/useAMLProgram';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LoadingState } from '@/components/ui/loading-state';
import { FormSection } from '@/components/layout/FormSection';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface AMLProgramSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function AMLProgramSection({ institutionId, onSectionUpdate }: AMLProgramSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, error, updateData, saveData } = useAMLProgram(institutionId);

  React.useEffect(() => {
    if (!data || !Object.keys(data).length) return;
    
    const totalFields = 5;
    let completedFields = 0;

    if (data.aml_policy_url) completedFields++;
    if (data.screening_tools?.length) completedFields++;
    if (data.risk_assessment_methodology) completedFields++;
    if (data.kyc_onboarding_checklist) completedFields++;
    if (data.kyt_monitoring_tool) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    const timeoutId = setTimeout(() => {
      onSectionUpdate('aml_program', {
        institution_id: institutionId,
        section_name: 'aml_program',
        is_completed: isCompleted,
        completion_percentage: percentage,
        last_updated_at: new Date()
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data, onSectionUpdate, institutionId]);

  const handleSave = async () => {
    try {
      await saveData(data);
      toast({
        title: "Success",
        description: "AML program saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to save AML program",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex-center py-8"><LoadingSpinner size="md" /></div>;
  }

  return (
    <div className="section-spacing">
      {saving && <LoadingState size="sm" text="Saving..." />}
      
      <FormSection 
        title="AML Policy & Risk Assessment"
        description="Core AML policy and risk assessment methodology"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>AML Policy URL *</Label>
            <Input
              type="url"
              value={data.aml_policy_url || ''}
              onChange={(e) => updateData({ aml_policy_url: e.target.value })}
              placeholder="https://policies.example.com/aml"
            />
          </div>
          <div className="space-y-2">
            <Label>Risk Assessment Methodology *</Label>
            <Textarea
              value={data.risk_assessment_methodology || ''}
              onChange={(e) => updateData({ risk_assessment_methodology: e.target.value })}
              placeholder="Describe your risk assessment methodology"
              rows={3}
            />
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex-center-gap-2">
          {saving && <LoadingSpinner size="sm" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}