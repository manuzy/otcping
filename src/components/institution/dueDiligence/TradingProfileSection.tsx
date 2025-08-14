import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTradingProfile } from '@/hooks/useTradingProfile';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface TradingProfileSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

const AssetClasses = [
  'Equities',
  'Fixed Income',
  'Foreign Exchange',
  'Commodities',
  'Derivatives',
  'Cryptocurrency',
  'Money Markets',
  'Structured Products'
];

const VenuesMethods = [
  'Regulated Exchanges',
  'MTFs',
  'OTC',
  'Electronic Trading Platforms',
  'Voice Trading',
  'Prime Brokerage'
];

const SettlementMethods = [
  'DVP (Delivery vs Payment)',
  'T+0',
  'T+1',
  'T+2',
  'T+3',
  'Cash Settlement',
  'Physical Settlement'
];

const CustodyModels = [
  'Self-Custody',
  'Third-Party Custody',
  'Prime Brokerage',
  'Hybrid Model'
];

export default function TradingProfileSection({ institutionId, onSectionUpdate }: TradingProfileSectionProps) {
  const { data, loading, saving, updateData } = useTradingProfile(institutionId);

  useEffect(() => {
    const totalFields = 8;
    let completedFields = 0;

    if (data.asset_classes?.length) completedFields++;
    if (data.venues_methods?.length) completedFields++;
    if (data.best_execution_policy_url) completedFields++;
    if (data.settlement_methods?.length) completedFields++;
    if (data.custody_model) completedFields++;
    if (data.counterparties?.length) completedFields++;
    if (data.custodians?.length) completedFields++;
    if (data.collateral_practices) completedFields++;

    const percentage = Math.round((completedFields / totalFields) * 100);
    const isCompleted = percentage >= 80;

    onSectionUpdate('trading_profile', {
      institution_id: institutionId,
      section_name: 'trading_profile',
      is_completed: isCompleted,
      completion_percentage: percentage,
      last_updated_at: new Date()
    });
  }, [data, onSectionUpdate]);

  const handleAssetClassChange = (assetClass: string, checked: boolean) => {
    const current = data.asset_classes || [];
    const updated = checked 
      ? [...current, assetClass]
      : current.filter(ac => ac !== assetClass);
    updateData({ asset_classes: updated });
  };

  const handleVenueMethodChange = (venue: string, checked: boolean) => {
    const current = data.venues_methods || [];
    const updated = checked 
      ? [...current, venue]
      : current.filter(v => v !== venue);
    updateData({ venues_methods: updated });
  };

  const handleSettlementMethodChange = (method: string, checked: boolean) => {
    const current = data.settlement_methods || [];
    const updated = checked 
      ? [...current, method]
      : current.filter(m => m !== method);
    updateData({ settlement_methods: updated });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading & Execution</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading & Execution</CardTitle>
        <CardDescription>
          Trading capabilities, execution arrangements, and custody details
          {saving && <span className="text-muted-foreground ml-2">(Saving...)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Asset Classes */}
        <div className="space-y-3">
          <Label>Asset Classes Traded *</Label>
          <div className="grid grid-cols-2 gap-3">
            {AssetClasses.map((assetClass) => (
              <div key={assetClass} className="flex items-center space-x-2">
                <Checkbox
                  id={assetClass}
                  checked={data.asset_classes?.includes(assetClass) || false}
                  onCheckedChange={(checked) => handleAssetClassChange(assetClass, checked as boolean)}
                />
                <Label htmlFor={assetClass} className="text-sm font-normal">
                  {assetClass}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Venues & Methods */}
        <div className="space-y-3">
          <Label>Trading Venues & Methods *</Label>
          <div className="grid grid-cols-2 gap-3">
            {VenuesMethods.map((venue) => (
              <div key={venue} className="flex items-center space-x-2">
                <Checkbox
                  id={venue}
                  checked={data.venues_methods?.includes(venue) || false}
                  onCheckedChange={(checked) => handleVenueMethodChange(venue, checked as boolean)}
                />
                <Label htmlFor={venue} className="text-sm font-normal">
                  {venue}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Best Execution Policy */}
        <div className="space-y-2">
          <Label htmlFor="best-execution-url">Best Execution Policy URL</Label>
          <Input
            id="best-execution-url"
            type="url"
            placeholder="https://example.com/best-execution-policy"
            value={data.best_execution_policy_url || ''}
            onChange={(e) => updateData({ best_execution_policy_url: e.target.value })}
          />
        </div>

        {/* Settlement Methods */}
        <div className="space-y-3">
          <Label>Settlement Methods *</Label>
          <div className="grid grid-cols-2 gap-3">
            {SettlementMethods.map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <Checkbox
                  id={method}
                  checked={data.settlement_methods?.includes(method) || false}
                  onCheckedChange={(checked) => handleSettlementMethodChange(method, checked as boolean)}
                />
                <Label htmlFor={method} className="text-sm font-normal">
                  {method}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Custody Model */}
        <div className="space-y-2">
          <Label htmlFor="custody-model">Custody Model *</Label>
          <Select 
            value={data.custody_model || ''} 
            onValueChange={(value) => updateData({ custody_model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select custody model" />
            </SelectTrigger>
            <SelectContent>
              {CustodyModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Counterparties */}
        <div className="space-y-2">
          <Label htmlFor="counterparties">Key Counterparties</Label>
          <Textarea
            id="counterparties"
            placeholder="List key counterparties (one per line)"
            value={data.counterparties?.join('\n') || ''}
            onChange={(e) => updateData({ 
              counterparties: e.target.value.split('\n').filter(p => p.trim()) 
            })}
            rows={3}
          />
        </div>

        {/* Custodians */}
        <div className="space-y-2">
          <Label htmlFor="custodians">Custodians</Label>
          <Textarea
            id="custodians"
            placeholder="List custodians used (one per line)"
            value={data.custodians?.join('\n') || ''}
            onChange={(e) => updateData({ 
              custodians: e.target.value.split('\n').filter(c => c.trim()) 
            })}
            rows={3}
          />
        </div>

        {/* Collateral Practices */}
        <div className="space-y-2">
          <Label htmlFor="collateral-practices">Collateral Management Practices</Label>
          <Textarea
            id="collateral-practices"
            placeholder="Describe collateral management and margin practices"
            value={data.collateral_practices || ''}
            onChange={(e) => updateData({ collateral_practices: e.target.value })}
            rows={3}
          />
        </div>

        {/* Rehypothecation Policy */}
        <div className="space-y-2">
          <Label htmlFor="rehypothecation-policy">Rehypothecation Policy</Label>
          <Textarea
            id="rehypothecation-policy"
            placeholder="Describe rehypothecation policies and practices"
            value={data.rehypothecation_policy || ''}
            onChange={(e) => updateData({ rehypothecation_policy: e.target.value })}
            rows={2}
          />
        </div>

        {/* Conflict of Interest */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conflict-management">Conflict of Interest Management</Label>
            <Textarea
              id="conflict-management"
              placeholder="Describe how conflicts of interest are identified and managed"
              value={data.conflict_management_description || ''}
              onChange={(e) => updateData({ conflict_management_description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conflict-policy-url">Conflict of Interest Policy URL</Label>
            <Input
              id="conflict-policy-url"
              type="url"
              placeholder="https://example.com/conflict-policy"
              value={data.conflict_policy_url || ''}
              onChange={(e) => updateData({ conflict_policy_url: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}