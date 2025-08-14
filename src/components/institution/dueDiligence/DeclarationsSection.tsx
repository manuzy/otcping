import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeclarations } from '@/hooks/useDeclarations';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface DeclarationsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function DeclarationsSection({ institutionId, onSectionUpdate }: DeclarationsSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, updateData, saveData } = useDeclarations(institutionId);

  const handleSave = async () => {
    try {
      await saveData(data);
      toast({ title: "Success", description: "Declarations saved successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save declarations", variant: "destructive" });
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
          <CardTitle>Truth & Accuracy Declaration</CardTitle>
          <CardDescription>Declaration that all information provided is accurate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="truthful_complete"
              checked={data.information_truthful_complete || false}
              onCheckedChange={(checked) => updateData({ information_truthful_complete: checked as boolean })}
            />
            <Label htmlFor="truthful_complete">
              I declare that all information provided is truthful and complete
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notification_obligation"
              checked={data.notification_obligation_accepted || false}
              onCheckedChange={(checked) => updateData({ notification_obligation_accepted: checked as boolean })}
            />
            <Label htmlFor="notification_obligation">
              I accept the obligation to notify of material changes
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electronic Signature</CardTitle>
          <CardDescription>Authorized signatory details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signer Name</Label>
              <Input
                value={data.signer_name || ''}
                onChange={(e) => updateData({ signer_name: e.target.value })}
                placeholder="Full name of signatory"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature Level</Label>
              <Select
                value={data.signature_level || ''}
                onValueChange={(value) => updateData({ signature_level: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select signature level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualified">Qualified Electronic Signature</SelectItem>
                  <SelectItem value="advanced">Advanced Electronic Signature</SelectItem>
                </SelectContent>
              </Select>
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