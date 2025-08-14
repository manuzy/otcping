import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAMLProgram } from '@/hooks/useAMLProgram';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface AMLProgramSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function AMLProgramSection({ institutionId, onSectionUpdate }: AMLProgramSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, error, updateData, saveData } = useAMLProgram(institutionId);

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
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {saving && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Saving...</div>}
      
      <Card>
        <CardHeader>
          <CardTitle>AML Policy & Risk Assessment</CardTitle>
          <CardDescription>Core AML policy and risk assessment methodology</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}