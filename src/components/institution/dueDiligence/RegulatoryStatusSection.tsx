import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRegulatoryStatus } from '@/hooks/useRegulatoryStatus';
import { Badge } from '@/components/ui/badge';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';
import { LICENSE_CATEGORIES } from '@/types/dueDiligence';

interface RegulatoryStatusSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function RegulatoryStatusSection({ institutionId, onSectionUpdate }: RegulatoryStatusSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, error, updateData, saveData } = useRegulatoryStatus(institutionId);

  const handleSave = async () => {
    try {
      await saveData(data);
      toast({
        title: "Success",
        description: "Regulatory status saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save regulatory status",
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
          <CardTitle>Primary Regulatory Authority</CardTitle>
          <CardDescription>Main supervisory authority and license details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Authority *</Label>
              <Input
                value={data.primary_authority || ''}
                onChange={(e) => updateData({ primary_authority: e.target.value })}
                placeholder="e.g., FCA, BaFin, FINRA"
              />
            </div>
            <div className="space-y-2">
              <Label>License Number *</Label>
              <Input
                value={data.license_number || ''}
                onChange={(e) => updateData({ license_number: e.target.value })}
                placeholder="Enter license number"
              />
            </div>
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