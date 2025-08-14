import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useInstitution } from '@/hooks/useInstitution';
import { useSectionCompletion } from '@/hooks/useSectionCompletion';
import CorporateProfileSection from '@/components/institution/dueDiligence/CorporateProfileSection';
import RegulatoryStatusSection from '@/components/institution/dueDiligence/RegulatoryStatusSection';
import GovernanceSection from '@/components/institution/dueDiligence/GovernanceSection';
import FinancialsSection from '@/components/institution/dueDiligence/FinancialsSection';
import OperationsSection from '@/components/institution/dueDiligence/OperationsSection';
import TradingProfileSection from '@/components/institution/dueDiligence/TradingProfileSection';
import AMLProgramSection from '@/components/institution/dueDiligence/AMLProgramSection';
import LegalStatusSection from '@/components/institution/dueDiligence/LegalStatusSection';
import DeclarationsSection from '@/components/institution/dueDiligence/DeclarationsSection';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

const sections: Array<{
  id: DueDiligenceSection;
  title: string;
  description: string;
  required: boolean;
}> = [
  {
    id: 'corporate_profile',
    title: 'Corporate Profile',
    description: 'Legal entity information and corporate structure',
    required: true
  },
  {
    id: 'regulatory_status',
    title: 'Regulatory Status',
    description: 'Licenses, registrations, and regulatory approvals',
    required: true
  },
  {
    id: 'governance',
    title: 'Governance & Control Functions',
    description: 'Board structure and key control functions',
    required: true
  },
  {
    id: 'financials',
    title: 'Financial Soundness',
    description: 'Capital adequacy and financial health',
    required: true
  },
  {
    id: 'operations',
    title: 'Operations & IT',
    description: 'IT infrastructure, BCP/DRP, and operational setup',
    required: true
  },
  {
    id: 'trading_profile',
    title: 'Trading & Execution',
    description: 'Trading capabilities and execution arrangements',
    required: true
  },
  {
    id: 'aml_program',
    title: 'AML/KYC/KYT Program',
    description: 'Anti-money laundering and compliance programs',
    required: true
  },
  {
    id: 'legal_status',
    title: 'Legal & Reputational',
    description: 'Litigation, regulatory actions, and reputation',
    required: true
  },
  {
    id: 'declarations',
    title: 'Declarations & Attestations',
    description: 'Final declarations and electronic signatures',
    required: true
  }
];

export default function InstitutionDueDiligence() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { institution, loading: institutionLoading } = useInstitution();
  const { completions, updateCompletion, overallProgress, completedSections } = useSectionCompletion(institution?.id || '');
  const [activeTab, setActiveTab] = useState<DueDiligenceSection>('corporate_profile');

  useEffect(() => {
    if (!institutionLoading && !institution) {
      navigate('/settings');
      return;
    }

    if (institution && !institution.is_admin) {
      toast({
        title: "Access Denied",
        description: "Only institution administrators can access due diligence settings.",
        variant: "destructive",
      });
      navigate('/settings');
      return;
    }
  }, [institution, institutionLoading, navigate, toast]);

  const handleSectionUpdate = async (sectionName: DueDiligenceSection, completion: SectionCompletion) => {
    try {
      await updateCompletion(sectionName, completion);
      toast({
        title: "Section Updated",
        description: `${sections.find(s => s.id === sectionName)?.title} progress saved.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save section progress.",
        variant: "destructive"
      });
    }
  };

  const getSectionIcon = (sectionId: DueDiligenceSection) => {
    const completion = completions[sectionId];
    if (completion?.is_completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (completion?.completion_percentage && completion.completion_percentage > 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSectionStatus = (sectionId: DueDiligenceSection) => {
    const completion = completions[sectionId];
    if (completion?.is_completed) {
      return 'Complete';
    } else if (completion?.completion_percentage && completion.completion_percentage > 0) {
      return `${completion.completion_percentage}%`;
    } else {
      return 'Not Started';
    }
  };

  const getSectionVariant = (sectionId: DueDiligenceSection): "default" | "secondary" | "destructive" | "outline" => {
    const completion = completions[sectionId];
    if (completion?.is_completed) {
      return 'default';
    } else if (completion?.completion_percentage && completion.completion_percentage > 0) {
      return 'secondary';
    } else {
      return 'outline';
    }
  };

  const renderSectionContent = () => {
    if (!institution) return null;

    const props = {
      institutionId: institution.id,
      onSectionUpdate: handleSectionUpdate
    };

    switch (activeTab) {
      case 'corporate_profile':
        return <CorporateProfileSection {...props} />;
      case 'regulatory_status':
        return <RegulatoryStatusSection {...props} />;
      case 'governance':
        return <GovernanceSection {...props} />;
      case 'financials':
        return <FinancialsSection {...props} />;
      case 'operations':
        return <OperationsSection {...props} />;
      case 'trading_profile':
        return <TradingProfileSection {...props} />;
      case 'aml_program':
        return <AMLProgramSection {...props} />;
      case 'legal_status':
        return <LegalStatusSection {...props} />;
      case 'declarations':
        return <DeclarationsSection {...props} />;
      default:
        return <div>Section not implemented</div>;
    }
  };

  if (institutionLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
          <div className="grid gap-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>No Institution Found</CardTitle>
            <CardDescription>
              You need to be part of an institution to access due diligence settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings')}>
              Back to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Progress is calculated in the hook

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Institutional Due Diligence</h1>
          </div>
          <p className="text-muted-foreground">
            Complete regulatory due diligence for {institution.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
          <div className="text-sm text-muted-foreground">
            {completedSections} of {sections.length} sections complete
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
          <CardDescription>
            Track your completion progress across all due diligence sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center space-x-2">
                {getSectionIcon(section.id)}
                <div className="flex-1">
                  <div className="text-sm font-medium">{section.title}</div>
                  <Badge variant={getSectionVariant(section.id)} className="text-xs">
                    {getSectionStatus(section.id)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DueDiligenceSection)}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 h-auto">
          {sections.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="flex flex-col items-center gap-1 p-3 h-auto"
            >
              <div className="flex items-center gap-1">
                {getSectionIcon(section.id)}
                <span className="text-xs font-medium leading-none">
                  {section.title}
                </span>
              </div>
              {section.required && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Required
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="text-muted-foreground">{section.description}</p>
              {section.required && (
                <Badge variant="destructive" className="mt-2">
                  Required Section
                </Badge>
              )}
            </div>
            
            {renderSectionContent()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}