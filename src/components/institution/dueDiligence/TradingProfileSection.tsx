import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

interface TradingProfileSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function TradingProfileSection({ institutionId, onSectionUpdate }: TradingProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading & Execution</CardTitle>
        <CardDescription>
          Trading capabilities and execution arrangements (Coming Soon)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This section will include asset classes, trading venues, best execution policy, 
          settlement methods, and custody arrangements.
        </p>
      </CardContent>
    </Card>
  );
}