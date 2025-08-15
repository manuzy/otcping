import React, { useEffect, useState } from 'react';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLegalStatus } from '@/hooks/useLegalStatus';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface LegalStatusSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

interface LocalLegalCase {
  id: string;
  type: 'litigation' | 'regulatory_action';
  title: string;
  description: string;
  status: string;
  date: string;
  amount?: string;
  outcome?: string;
}

const AdverseMediaMethods = [
  'Internal screening',
  'Third-party provider',
  'Manual review',
  'Automated tools'
];

export default function LegalStatusSection({ institutionId, onSectionUpdate }: LegalStatusSectionProps) {
  const { data, loading, saving, updateData, saveData } = useLegalStatus(institutionId);

  const handleSave = async () => {
    try {
      await saveData(data);
    } catch (error) {
      console.error('Error saving legal status data:', error);
    }
  };
  const [newCase, setNewCase] = useState<Partial<LocalLegalCase>>({});
  const [showAddCase, setShowAddCase] = useState(false);

  useEffect(() => {
    if (!data || !Object.keys(data).length) return;
    
    const totalFields = 4;
    let completedFields = 0;

    if (data.litigation_investigations?.length) completedFields++;
    if (data.regulatory_actions?.length) completedFields++;
    if (data.adverse_media_method) completedFields++;
    if (data.adverse_media_check_date) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    const timeoutId = setTimeout(() => {
      onSectionUpdate('legal_status', {
        institution_id: institutionId,
        section_name: 'legal_status',
        is_completed: isCompleted,
        completion_percentage: percentage,
        last_updated_at: new Date()
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data, onSectionUpdate, institutionId]);

  const addCase = () => {
    if (!newCase.title || !newCase.type) return;

    const caseToAdd: LocalLegalCase = {
      id: Date.now().toString(),
      type: newCase.type!,
      title: newCase.title!,
      description: newCase.description || '',
      status: newCase.status || 'ongoing',
      date: newCase.date || new Date().toISOString(),
      amount: newCase.amount,
      outcome: newCase.outcome
    };

    if (newCase.type === 'litigation') {
      const current = data.litigation_investigations || [];
      updateData({ litigation_investigations: [...current, caseToAdd as any] });
    } else {
      const current = data.regulatory_actions || [];
      updateData({ regulatory_actions: [...current, caseToAdd as any] });
    }

    setNewCase({});
    setShowAddCase(false);
  };

  const removeCase = (id: string, type: 'litigation' | 'regulatory_action') => {
    if (type === 'litigation') {
      const current = data.litigation_investigations || [];
      updateData({ litigation_investigations: current.filter((c: any) => c.id !== id) });
    } else {
      const current = data.regulatory_actions || [];
      updateData({ regulatory_actions: current.filter((c: any) => c.id !== id) });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Legal & Reputational</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allCases: LocalLegalCase[] = [
    ...(data.litigation_investigations || []).map((c: any) => ({ ...c, type: 'litigation' as const })),
    ...(data.regulatory_actions || []).map((c: any) => ({ ...c, type: 'regulatory_action' as const }))
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Reputational</CardTitle>
        <CardDescription>
          Litigation history, regulatory actions, and adverse media screening
          {saving && <span className="text-muted-foreground ml-2">(Saving...)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legal Cases Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-medium">Legal Cases & Regulatory Actions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCase(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Case
            </Button>
          </div>

          {/* Add New Case Form */}
          {showAddCase && (
            <Card className="p-4 border-dashed">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type *</Label>
                    <Select 
                      value={newCase.type || ''} 
                      onValueChange={(value) => setNewCase({ ...newCase, type: value as 'litigation' | 'regulatory_action' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="litigation">Litigation</SelectItem>
                        <SelectItem value="regulatory_action">Regulatory Action</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={newCase.status || 'ongoing'} 
                      onValueChange={(value) => setNewCase({ ...newCase, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="settled">Settled</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Brief case title"
                    value={newCase.title || ''}
                    onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Case description and current status"
                    value={newCase.description || ''}
                    onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addCase} disabled={!newCase.title || !newCase.type}>
                    Add Case
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setNewCase({});
                    setShowAddCase(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Existing Cases */}
          {allCases.length > 0 ? (
            <div className="space-y-3">
              {allCases.map((legalCase) => (
                <Card key={legalCase.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{legalCase.title}</span>
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          legalCase.type === 'litigation' 
                            ? "bg-error text-error-foreground" 
                            : "bg-warning text-warning-foreground"
                        )}>
                          {legalCase.type === 'litigation' ? 'Litigation' : 'Regulatory Action'}
                        </span>
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          legalCase.status === 'ongoing' 
                            ? "bg-warning text-warning-foreground" 
                            : "bg-success text-success-foreground"
                        )}>
                          {legalCase.status}
                        </span>
                      </div>
                      {legalCase.description && (
                        <p className="text-sm text-muted-foreground">{legalCase.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCase(legalCase.id, legalCase.type)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No legal cases or regulatory actions on record
            </p>
          )}
        </div>

        {/* Adverse Media Screening */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Adverse Media Screening</Label>
          
          <div className="space-y-2">
            <Label htmlFor="adverse-media-method">Screening Method</Label>
            <Select 
              value={data.adverse_media_method || ''} 
              onValueChange={(value) => updateData({ adverse_media_method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select screening method" />
              </SelectTrigger>
              <SelectContent>
                {AdverseMediaMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Last Adverse Media Check Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !data.adverse_media_check_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.adverse_media_check_date ? format(data.adverse_media_check_date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.adverse_media_check_date}
                  onSelect={(date) => updateData({ adverse_media_check_date: date })}
                  className="pointer-events-auto"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adverse-media-summary">Adverse Media Summary</Label>
            <Textarea
              id="adverse-media-summary"
              placeholder="Summary of adverse media findings (if any)"
              value={data.adverse_media_summary || ''}
              onChange={(e) => updateData({ adverse_media_summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adverse-media-report">Adverse Media Report URL</Label>
            <Input
              id="adverse-media-report"
              type="url"
              placeholder="https://example.com/adverse-media-report"
              value={data.adverse_media_report_url || ''}
              onChange={(e) => updateData({ adverse_media_report_url: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
      <div className="flex justify-end p-6 pt-0">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </Card>
  );
}