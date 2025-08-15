import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGovernance } from '@/hooks/useGovernance';
import { Badge } from '@/components/ui/badge';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface GovernanceSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function GovernanceSection({ institutionId, onSectionUpdate }: GovernanceSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, error, updateData, saveData } = useGovernance(institutionId);

  React.useEffect(() => {
    console.log('🔍 Governance completion calculation:', { data, institutionId });
    
    const totalFields = 3;
    let completedFields = 0;

    if (data?.compliance_officer) completedFields++;
    if (data?.risk_officer) completedFields++;
    if (data?.internal_audit_officer) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    console.log('🔍 Governance completion result:', { completedFields, totalFields, percentage, isCompleted });

    const timeoutId = setTimeout(() => {
      onSectionUpdate('governance', {
        institution_id: institutionId,
        section_name: 'governance',
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
        description: "Governance section saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save governance data",
        variant: "destructive",
      });
    }
  };

  const updateCorePolicy = (key: string, value: boolean) => {
    updateData({
      core_policies: {
        ...data.core_policies,
        [key]: value
      }
    });
  };

  const addBoardCommittee = () => {
    const newCommittees = [...(data.board_committees || []), {
      name: '',
      members: [],
      independence: false,
      meeting_cadence: ''
    }];
    updateData({ board_committees: newCommittees });
  };

  const updateBoardCommittee = (index: number, field: string, value: any) => {
    const updated = [...(data.board_committees || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ board_committees: updated });
  };

  const removeBoardCommittee = (index: number) => {
    const updated = data.board_committees?.filter((_, i) => i !== index) || [];
    updateData({ board_committees: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
      
      {error && (
        <Badge variant="destructive" className="mb-4">
          Error: {error}
        </Badge>
      )}

      {/* Three Lines of Defense */}
      <Card>
        <CardHeader>
          <CardTitle>Three Lines of Defense</CardTitle>
          <CardDescription>
            Governance framework implementation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="three_lines_implemented"
              checked={data.three_lines_implemented || false}
              onCheckedChange={(checked) => updateData({ three_lines_implemented: checked as boolean })}
            />
            <Label htmlFor="three_lines_implemented">
              Three Lines of Defense model is implemented
            </Label>
          </div>
          
          {data.three_lines_implemented && (
            <div className="space-y-2">
              <Label htmlFor="three_lines_description">Implementation Description</Label>
              <Textarea
                id="three_lines_description"
                value={data.three_lines_description || ''}
                onChange={(e) => updateData({ three_lines_description: e.target.value })}
                placeholder="Describe how the Three Lines of Defense model is implemented"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Control Functions</CardTitle>
          <CardDescription>
            Compliance, risk, and internal audit officers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Officer */}
          <div className="card-base">
            <h4 className="font-medium">Compliance Officer</h4>
            <div className="grid-responsive">
              <div className="space-y-2">
                <Label htmlFor="compliance_officer">Name *</Label>
                <Input
                  id="compliance_officer"
                  value={data.compliance_officer || ''}
                  onChange={(e) => updateData({ compliance_officer: e.target.value })}
                  placeholder="Enter compliance officer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compliance_qualifications">Qualifications</Label>
                <Input
                  id="compliance_qualifications"
                  value={data.compliance_qualifications || ''}
                  onChange={(e) => updateData({ compliance_qualifications: e.target.value })}
                  placeholder="Professional qualifications"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance_reporting_line">Reporting Line</Label>
              <Input
                id="compliance_reporting_line"
                value={data.compliance_reporting_line || ''}
                onChange={(e) => updateData({ compliance_reporting_line: e.target.value })}
                placeholder="Who does the compliance officer report to?"
              />
            </div>
          </div>

          {/* Risk Officer */}
          <div className="card-base">
            <h4 className="font-medium">Risk Officer</h4>
            <div className="grid-responsive">
              <div className="space-y-2">
                <Label htmlFor="risk_officer">Name *</Label>
                <Input
                  id="risk_officer"
                  value={data.risk_officer || ''}
                  onChange={(e) => updateData({ risk_officer: e.target.value })}
                  placeholder="Enter risk officer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk_qualifications">Qualifications</Label>
                <Input
                  id="risk_qualifications"
                  value={data.risk_qualifications || ''}
                  onChange={(e) => updateData({ risk_qualifications: e.target.value })}
                  placeholder="Professional qualifications"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk_reporting_line">Reporting Line</Label>
              <Input
                id="risk_reporting_line"
                value={data.risk_reporting_line || ''}
                onChange={(e) => updateData({ risk_reporting_line: e.target.value })}
                placeholder="Who does the risk officer report to?"
              />
            </div>
          </div>

          {/* Internal Audit Officer */}
          <div className="card-base">
            <h4 className="font-medium">Internal Audit Officer</h4>
            <div className="grid-responsive">
              <div className="space-y-2">
                <Label htmlFor="internal_audit_officer">Name *</Label>
                <Input
                  id="internal_audit_officer"
                  value={data.internal_audit_officer || ''}
                  onChange={(e) => updateData({ internal_audit_officer: e.target.value })}
                  placeholder="Enter internal audit officer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_audit_qualifications">Qualifications</Label>
                <Input
                  id="internal_audit_qualifications"
                  value={data.internal_audit_qualifications || ''}
                  onChange={(e) => updateData({ internal_audit_qualifications: e.target.value })}
                  placeholder="Professional qualifications"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_audit_reporting_line">Reporting Line</Label>
              <Input
                id="internal_audit_reporting_line"
                value={data.internal_audit_reporting_line || ''}
                onChange={(e) => updateData({ internal_audit_reporting_line: e.target.value })}
                placeholder="Who does the internal audit officer report to?"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Board Committees */}
      <Card>
        <CardHeader>
          <CardTitle>Board Committees</CardTitle>
          <CardDescription>
            Board committees and their composition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.board_committees?.map((committee: any, index: number) => (
            <div key={index} className="card-base">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Committee {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBoardCommittee(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Committee Name</Label>
                  <Input
                    value={committee.name || ''}
                    onChange={(e) => updateBoardCommittee(index, 'name', e.target.value)}
                    placeholder="e.g., Audit Committee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Cadence</Label>
                  <Input
                    value={committee.meeting_cadence || ''}
                    onChange={(e) => updateBoardCommittee(index, 'meeting_cadence', e.target.value)}
                    placeholder="e.g., Quarterly, Monthly"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`independence-${index}`}
                  checked={committee.independence || false}
                  onCheckedChange={(checked) => updateBoardCommittee(index, 'independence', checked as boolean)}
                />
                <Label htmlFor={`independence-${index}`}>
                  Committee has independent members
                </Label>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={addBoardCommittee}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Committee
          </Button>
        </CardContent>
      </Card>

      {/* Core Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Core Policy Documentation</CardTitle>
          <CardDescription>
            Check which policies are in place
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="risk_framework"
                checked={data.core_policies?.risk_framework || false}
                onCheckedChange={(checked) => updateCorePolicy('risk_framework', checked as boolean)}
              />
              <Label htmlFor="risk_framework">Risk Framework</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compliance_manual"
                checked={data.core_policies?.compliance_manual || false}
                onCheckedChange={(checked) => updateCorePolicy('compliance_manual', checked as boolean)}
              />
              <Label htmlFor="compliance_manual">Compliance Manual</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal_audit_charter"
                checked={data.core_policies?.internal_audit_charter || false}
                onCheckedChange={(checked) => updateCorePolicy('internal_audit_charter', checked as boolean)}
              />
              <Label htmlFor="internal_audit_charter">Internal Audit Charter</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="conflicts_of_interest"
                checked={data.core_policies?.conflicts_of_interest || false}
                onCheckedChange={(checked) => updateCorePolicy('conflicts_of_interest', checked as boolean)}
              />
              <Label htmlFor="conflicts_of_interest">Conflicts of Interest</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remuneration"
                checked={data.core_policies?.remuneration || false}
                onCheckedChange={(checked) => updateCorePolicy('remuneration', checked as boolean)}
              />
              <Label htmlFor="remuneration">Remuneration Policy</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="outsourcing"
                checked={data.core_policies?.outsourcing || false}
                onCheckedChange={(checked) => updateCorePolicy('outsourcing', checked as boolean)}
              />
              <Label htmlFor="outsourcing">Outsourcing Policy</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="best_execution"
                checked={data.core_policies?.best_execution || false}
                onCheckedChange={(checked) => updateCorePolicy('best_execution', checked as boolean)}
              />
              <Label htmlFor="best_execution">Best Execution Policy</Label>
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