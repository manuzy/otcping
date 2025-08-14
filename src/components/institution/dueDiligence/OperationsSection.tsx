import React, { useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOperations } from '@/hooks/useOperations';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface OperationsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

const ITOperatingModels = [
  'On-prem',
  'Cloud',
  'Hybrid'
];

const SecurityCertifications = [
  'ISO 27001',
  'SOC 2 Type II',
  'PCI DSS',
  'NIST Cybersecurity Framework',
  'Cloud Security Alliance'
];

const ReportingInterfaces = [
  'API',
  'SFTP',
  'Email Reports',
  'Web Portal',
  'Real-time Feed'
];

export default function OperationsSection({ institutionId, onSectionUpdate }: OperationsSectionProps) {
  const { data, loading, saving, updateData } = useOperations(institutionId);

  useEffect(() => {
    const totalFields = 10;
    let completedFields = 0;

    if (data.it_operating_model) completedFields++;
    if (data.primary_providers?.length) completedFields++;
    if (data.security_certifications?.length) completedFields++;
    if (data.last_pentest_date) completedFields++;
    if (data.bcp_rto_minutes) completedFields++;
    if (data.bcp_rpo_minutes) completedFields++;
    if (data.last_bcp_test_date) completedFields++;
    if (data.emergency_contacts?.length) completedFields++;
    if (data.reporting_interfaces?.length) completedFields++;
    if (data.outsourcing_arrangements?.length) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    onSectionUpdate('operations', {
      institution_id: institutionId,
      section_name: 'operations',
      is_completed: isCompleted,
      completion_percentage: percentage,
      last_updated_at: new Date()
    });
  }, [data, onSectionUpdate]);

  const handleCheckboxChange = (certification: string, checked: boolean) => {
    const current = data.security_certifications || [];
    const updated = checked 
      ? [...current, certification]
      : current.filter(c => c !== certification);
    updateData({ security_certifications: updated });
  };

  const handleReportingInterfaceChange = (iface: string, checked: boolean) => {
    const current = data.reporting_interfaces || [];
    const updated = checked 
      ? [...current, iface]
      : current.filter(i => i !== iface);
    updateData({ reporting_interfaces: updated });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operations & IT</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations & IT</CardTitle>
        <CardDescription>
          IT infrastructure, security, business continuity, and operational arrangements
          {saving && <span className="text-muted-foreground ml-2">(Saving...)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IT Operating Model */}
        <div className="space-y-2">
          <Label htmlFor="it-operating-model">IT Operating Model *</Label>
          <Select 
            value={data.it_operating_model || ''} 
            onValueChange={(value) => updateData({ it_operating_model: value as 'On-prem' | 'Cloud' | 'Hybrid' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select IT operating model" />
            </SelectTrigger>
            <SelectContent>
              {ITOperatingModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Providers */}
        <div className="space-y-2">
          <Label htmlFor="primary-providers">Primary IT Providers</Label>
          <Textarea
            id="primary-providers"
            placeholder="List primary IT service providers (one per line)"
            value={data.primary_providers?.join('\n') || ''}
            onChange={(e) => updateData({ 
              primary_providers: e.target.value.split('\n').filter(p => p.trim()) 
            })}
            rows={3}
          />
        </div>

        {/* Security Certifications */}
        <div className="space-y-3">
          <Label>Security Certifications</Label>
          <div className="grid grid-cols-2 gap-3">
            {SecurityCertifications.map((cert) => (
              <div key={cert} className="flex items-center space-x-2">
                <Checkbox
                  id={cert}
                  checked={data.security_certifications?.includes(cert) || false}
                  onCheckedChange={(checked) => handleCheckboxChange(cert, checked as boolean)}
                />
                <Label htmlFor={cert} className="text-sm font-normal">
                  {cert}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Last Penetration Test */}
        <div className="space-y-2">
          <Label>Last Penetration Test Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !data.last_pentest_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.last_pentest_date ? format(data.last_pentest_date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.last_pentest_date}
                onSelect={(date) => updateData({ last_pentest_date: date })}
                className="pointer-events-auto"
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* BCP/DRP Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bcp-rto">RTO (Minutes)</Label>
            <Input
              id="bcp-rto"
              type="number"
              placeholder="Recovery Time Objective"
              value={data.bcp_rto_minutes || ''}
              onChange={(e) => updateData({ bcp_rto_minutes: parseInt(e.target.value) || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcp-rpo">RPO (Minutes)</Label>
            <Input
              id="bcp-rpo"
              type="number"
              placeholder="Recovery Point Objective"
              value={data.bcp_rpo_minutes || ''}
              onChange={(e) => updateData({ bcp_rpo_minutes: parseInt(e.target.value) || undefined })}
            />
          </div>
        </div>

        {/* Last BCP Test */}
        <div className="space-y-2">
          <Label>Last BCP/DRP Test Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !data.last_bcp_test_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.last_bcp_test_date ? format(data.last_bcp_test_date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.last_bcp_test_date}
                onSelect={(date) => updateData({ last_bcp_test_date: date })}
                className="pointer-events-auto"
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* BCP Test Results */}
        <div className="space-y-2">
          <Label htmlFor="bcp-results">BCP/DRP Test Results</Label>
          <Textarea
            id="bcp-results"
            placeholder="Summary of last BCP/DRP test results"
            value={data.bcp_test_results || ''}
            onChange={(e) => updateData({ bcp_test_results: e.target.value })}
            rows={3}
          />
        </div>

        {/* Reporting Interfaces */}
        <div className="space-y-3">
          <Label>Regulatory Reporting Interfaces</Label>
          <div className="grid grid-cols-2 gap-3">
            {ReportingInterfaces.map((iface) => (
              <div key={iface} className="flex items-center space-x-2">
                <Checkbox
                  id={iface}
                  checked={data.reporting_interfaces?.includes(iface) || false}
                  onCheckedChange={(checked) => handleReportingInterfaceChange(iface, checked as boolean)}
                />
                <Label htmlFor={iface} className="text-sm font-normal">
                  {iface}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="regulatory-reporting"
              checked={data.regulatory_reporting_supported || false}
              onCheckedChange={(checked) => updateData({ regulatory_reporting_supported: checked as boolean })}
            />
            <Label htmlFor="regulatory-reporting" className="text-sm font-normal">
              Regulatory reporting supported
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}