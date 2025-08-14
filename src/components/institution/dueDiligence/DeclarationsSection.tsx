import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface DeclarationsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function DeclarationsSection({ institutionId, onSectionUpdate }: DeclarationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Declarations & Attestations</CardTitle>
        <CardDescription>
          Final declarations and electronic signatures (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include truthfulness declarations, notification obligations, 
          and qualified electronic signature requirements.
        </p>
      </CardContent>
    </Card>
  );
}