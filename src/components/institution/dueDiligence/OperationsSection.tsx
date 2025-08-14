import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface OperationsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function OperationsSection({ institutionId, onSectionUpdate }: OperationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations & IT</CardTitle>
        <CardDescription>
          IT infrastructure, BCP/DRP, and operational setup (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include IT operating model, security certifications, BCP/DRP testing, 
          reporting capabilities, and outsourcing arrangements.
        </p>
      </CardContent>
    </Card>
  );
}