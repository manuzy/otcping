import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface AMLProgramSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function AMLProgramSection({ institutionId, onSectionUpdate }: AMLProgramSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AML/KYC/KYT Program</CardTitle>
        <CardDescription>
          Anti-money laundering and compliance programs (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include AML policy, MLRO contact, screening tools, sanctions lists, 
          KYC procedures, KYT monitoring, and Travel Rule compliance.
        </p>
      </CardContent>
    </Card>
  );
}