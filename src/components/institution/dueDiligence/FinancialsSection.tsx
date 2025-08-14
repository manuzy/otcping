import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface FinancialsSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function FinancialsSection({ institutionId, onSectionUpdate }: FinancialsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Soundness</CardTitle>
        <CardDescription>
          Capital adequacy and financial health (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include regulatory capital, minimum requirements, audited financial statements, 
          and professional indemnity insurance details.
        </p>
      </CardContent>
    </Card>
  );
}