import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFinancials } from '@/hooks/useFinancials';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LoadingState } from '@/components/ui/loading-state';
import { FormSection } from '@/components/layout/FormSection';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';
import { AUDIT_OPINIONS } from '@/types/dueDiligence';

interface FinancialsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function FinancialsSection({ institutionId, onSectionUpdate }: FinancialsSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, updateData, saveData } = useFinancials(institutionId);

  React.useEffect(() => {
    if (!data || !Object.keys(data).length) return;
    
    const totalFields = 5;
    let completedFields = 0;

    if (data.regulatory_capital_amount) completedFields++;
    if (data.minimum_capital_requirement) completedFields++;
    if (data.auditor_name) completedFields++;
    if (data.audit_opinion) completedFields++;
    if (data.as_of_date) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    const timeoutId = setTimeout(() => {
      onSectionUpdate('financials', {
        institution_id: institutionId,
        section_name: 'financials',
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
      toast({ title: "Success", description: "Financials saved successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save financials", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex-center py-8"><LoadingSpinner size="md" /></div>;
  }

  return (
    <div className="section-spacing">
      {saving && <LoadingState size="sm" text="Saving..." />}
      
      <FormSection 
        title="Capital & Financial Ratios"
        description="Regulatory capital and financial health indicators"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Regulatory Capital Amount</Label>
            <Input
              type="number"
              value={data.regulatory_capital_amount || ''}
              onChange={(e) => updateData({ regulatory_capital_amount: Number(e.target.value) })}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Auditor Name</Label>
            <Input
              value={data.auditor_name || ''}
              onChange={(e) => updateData({ auditor_name: e.target.value })}
              placeholder="External auditor name"
            />
          </div>
          <div className="space-y-2">
            <Label>Audit Opinion</Label>
            <Select
              value={data.audit_opinion || ''}
              onValueChange={(value) => updateData({ audit_opinion: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audit opinion" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_OPINIONS.map((opinion) => (
                  <SelectItem key={opinion} value={opinion}>{opinion}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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