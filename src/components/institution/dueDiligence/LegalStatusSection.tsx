import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface LegalStatusSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function LegalStatusSection({ institutionId, onSectionUpdate }: LegalStatusSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Reputational</CardTitle>
        <CardDescription>
          Litigation, regulatory actions, and reputation (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include litigation history, regulatory investigations, 
          enforcement actions, and adverse media screening.
        </p>
      </CardContent>
    </Card>
  );
}