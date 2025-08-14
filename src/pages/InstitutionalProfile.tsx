import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, ArrowLeft, Users, Save, CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';
import { useInstitution, useInstitutionUpdate } from '@/hooks/useInstitution';
import { useAuth } from '@/hooks/useAuth';
import { useSectionCompletion } from '@/hooks/useSectionCompletion';
import { notifications } from '@/lib/notifications';
import { sanitizeText, sanitizeDisplayName } from '@/components/ui/input-sanitizer';
import { InstitutionCreationData } from '@/types/institution';
import type { DueDiligenceSection, SectionCompletion } from '@/types/dueDiligence';

// Import all due diligence sections
import CorporateProfileSection from '@/components/institution/dueDiligence/CorporateProfileSection';
import RegulatoryStatusSection from '@/components/institution/dueDiligence/RegulatoryStatusSection';
import GovernanceSection from '@/components/institution/dueDiligence/GovernanceSection';
import FinancialsSection from '@/components/institution/dueDiligence/FinancialsSection';
import OperationsSection from '@/components/institution/dueDiligence/OperationsSection';
import TradingProfileSection from '@/components/institution/dueDiligence/TradingProfileSection';
import AMLProgramSection from '@/components/institution/dueDiligence/AMLProgramSection';
import LegalStatusSection from '@/components/institution/dueDiligence/LegalStatusSection';
import DeclarationsSection from '@/components/institution/dueDiligence/DeclarationsSection';

const sections = [
  { id: 'corporate-profile', title: 'Corporate Profile', description: 'Basic corporate information', required: true },
  { id: 'regulatory-status', title: 'Regulatory Status', description: 'Licenses and regulatory information', required: true },
  { id: 'governance', title: 'Governance', description: 'Board structure and control functions', required: true },
  { id: 'financials', title: 'Financials', description: 'Financial soundness and capital adequacy', required: true },
  { id: 'operations', title: 'Operations & IT', description: 'IT infrastructure and operational setup', required: true },
  { id: 'trading-profile', title: 'Trading Profile', description: 'Trading capabilities and execution', required: true },
  { id: 'aml-program', title: 'AML Program', description: 'Anti-money laundering and compliance', required: true },
  { id: 'legal-status', title: 'Legal Status', description: 'Litigation and regulatory actions', required: false },
  { id: 'declarations', title: 'Declarations', description: 'Final declarations and signatures', required: true },
];

export default function InstitutionalProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institution, loading, refetch } = useInstitution();
  const { updateInstitution, loading: updating } = useInstitutionUpdate();
  const { 
    completions, 
    loading: progressLoading, 
    updateCompletion, 
    overallProgress, 
    completedSections, 
    getSectionCompletion 
  } = useSectionCompletion(institution?.id || '');
  
  const [activeTab, setActiveTab] = useState('basic-info');
  const [formData, setFormData] = useState<InstitutionCreationData>({
    name: '',
    description: '',
    logo: '',
    public_description: '',
    private_description: ''
  });

  // Populate form with existing institution data
  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        description: institution.description || '',
        logo: institution.logo || '',
        public_description: institution.public_description || '',
        private_description: institution.private_description || ''
      });
    }
  }, [institution]);

  // Redirect if user is not institution creator/admin
  useEffect(() => {
    if (!loading && institution && !institution.is_admin) {
      notifications.error({
        title: "Access Denied",
        description: "Only institution administrators can edit institutional profile.",
      });
      navigate('/settings');
    }
  }, [institution, loading, navigate]);

  const handleSave = async () => {
    if (!institution?.id) return;

    try {
      const sanitizedData = {
        name: sanitizeDisplayName(formData.name),
        description: formData.description ? sanitizeText(formData.description) : undefined,
        logo: formData.logo || undefined,
        public_description: formData.public_description ? sanitizeText(formData.public_description) : undefined,
        private_description: formData.private_description ? sanitizeText(formData.private_description) : undefined
      };

      await updateInstitution(institution.id, sanitizedData);
      
      notifications.success({
        title: "Success",
        description: "Institution profile updated successfully!",
      });
      
      refetch();
    } catch (error) {
      console.error('Failed to update institution:', error);
    }
  };

  const handleSectionUpdate = async (sectionName: DueDiligenceSection, completion: SectionCompletion) => {
    if (!institution?.id) return;

    try {
      await updateCompletion(sectionName, completion);
      notifications.success({
        title: "Progress Saved",
        description: `${sectionName} section updated successfully.`
      });
    } catch (error) {
      console.error('Failed to update section completion:', error);
      notifications.error({
        title: "Save Failed",
        description: "Failed to save section progress."
      });
    }
  };

  const getSectionIcon = (sectionId: string) => {
    const completion = getSectionCompletion(sectionId as DueDiligenceSection);
    if (completion.is_completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (completion.completion_percentage > 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSectionStatus = (sectionId: string) => {
    const completion = getSectionCompletion(sectionId as DueDiligenceSection);
    if (completion.is_completed) return 'Complete';
    if (completion.completion_percentage > 0) return 'In Progress';
    return 'Not Started';
  };

  const getSectionVariant = (sectionId: string) => {
    const completion = getSectionCompletion(sectionId as DueDiligenceSection);
    if (completion.is_completed) return 'default';
    if (completion.completion_percentage > 0) return 'secondary';
    return 'outline';
  };

  const renderSectionContent = () => {
    if (!institution?.id) return null;

    switch (activeTab) {
      case 'corporate-profile':
        return <CorporateProfileSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'regulatory-status':
        return <RegulatoryStatusSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'governance':
        return <GovernanceSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'financials':
        return <FinancialsSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'operations':
        return <OperationsSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'trading-profile':
        return <TradingProfileSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'aml-program':
        return <AMLProgramSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'legal-status':
        return <LegalStatusSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      case 'declarations':
        return <DeclarationsSection institutionId={institution.id} onSectionUpdate={handleSectionUpdate} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No institution found. You must create an institution first.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Institutional Profile</h1>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>
            Complete your institutional profile for regulatory compliance and partner verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">Overall Progress</div>
                <div className="text-2xl font-bold text-primary">
                  {progressLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `${overallProgress}%`
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Completed Sections</div>
                <div className="text-lg font-semibold">
                  {progressLoading ? '...' : `${completedSections}/${sections.length}`}
                </div>
              </div>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 h-auto p-1">
          <TabsTrigger value="basic-info" className="text-xs px-2 py-2">
            Basic Info
          </TabsTrigger>
          {sections.map((section) => (
            <TabsTrigger 
              key={section.id} 
              value={section.id}
              className="text-xs px-2 py-2 flex items-center gap-1"
            >
              {getSectionIcon(section.id)}
              <span className="hidden lg:inline">{section.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic-info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Manage your institution's basic details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Institution Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter institution name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  type="url"
                />
              </div>

              <div>
                <Label htmlFor="description">Internal Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal description for your team"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="public_description">Public Description</Label>
                <Textarea
                  id="public_description"
                  value={formData.public_description}
                  onChange={(e) => setFormData({ ...formData, public_description: e.target.value })}
                  placeholder="Public description of your institution"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="private_description">Private Description</Label>
                <Textarea
                  id="private_description"
                  value={formData.private_description}
                  onChange={(e) => setFormData({ ...formData, private_description: e.target.value })}
                  placeholder="Private notes and information for internal use"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={updating || !formData.name.trim()}
                className="w-full"
                size="lg"
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Basic Information
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Institution Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Institution Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{institution.member_count}</div>
                  <div className="text-sm text-muted-foreground">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{institution.kyb_status}</div>
                  <div className="text-sm text-muted-foreground">KYB Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {new Date(institution.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Render Due Diligence Sections */}
        {sections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {getSectionIcon(section.id)}
                  {section.title}
                  {section.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <Badge variant={getSectionVariant(section.id)}>
                {getSectionStatus(section.id)}
              </Badge>
            </div>
            {renderSectionContent()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}