import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface GovernanceSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function GovernanceSection({ institutionId, onSectionUpdate }: GovernanceSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Governance & Control Functions</CardTitle>
        <CardDescription>
          Board structure and key control functions (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include Three Lines of Defense, Compliance Officer, Risk Officer, 
          Internal Audit, and core policy documentation.
        </p>
      </CardContent>
    </Card>
  );
}