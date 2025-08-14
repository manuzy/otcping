import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface RegulatoryStatusSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function RegulatoryStatusSection({ institutionId, onSectionUpdate }: RegulatoryStatusSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulatory Status</CardTitle>
        <CardDescription>
          Licenses, registrations, and regulatory approvals (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include fields for regulatory licenses, supervisory authorities, 
          license categories, operating jurisdictions, and related documentation.
        </p>
      </CardContent>
    </Card>
  );
}