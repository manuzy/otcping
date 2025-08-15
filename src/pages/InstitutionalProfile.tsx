import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeft, Users, Save, CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger,
  useSidebar 
} from '@/components/ui/sidebar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
  { id: 'basic-info', title: 'Basic Info', description: 'Basic institution details and branding', required: true },
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
  
  const [activeSection, setActiveSection] = useState('basic-info');
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

  // Calculate basic info completion
  const getBasicInfoCompletion = () => {
    if (!formData) return { is_completed: false, completion_percentage: 0 };
    
    const requiredFields = ['name'];
    const optionalFields = ['description', 'logo', 'public_description', 'private_description'];
    
    const completedRequired = requiredFields.filter(field => 
      formData[field as keyof InstitutionCreationData]?.trim()
    ).length;
    const completedOptional = optionalFields.filter(field => 
      formData[field as keyof InstitutionCreationData]?.trim()
    ).length;
    
    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = completedRequired + completedOptional;
    const percentage = Math.round((completedFields / totalFields) * 100);
    
    return {
      is_completed: completedRequired === requiredFields.length && percentage >= 80,
      completion_percentage: percentage
    };
  };

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
      
      // Update basic info completion
      const basicInfoProgress = getBasicInfoCompletion();
      const basicInfoCompletion: SectionCompletion = {
        institution_id: institution.id,
        section_name: 'basic-info' as DueDiligenceSection,
        is_completed: basicInfoProgress.is_completed,
        completion_percentage: basicInfoProgress.completion_percentage,
        last_updated_at: new Date()
      };
      await updateCompletion('basic-info' as DueDiligenceSection, basicInfoCompletion);
      
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
      // Remove automatic progress notifications to prevent toast loops
    } catch (error) {
      console.error('Failed to update section completion:', error);
      notifications.error({
        title: "Save Failed",
        description: "Failed to save section progress."
      });
    }
  };

  const getSectionIcon = (sectionId: string) => {
    let completion;
    if (sectionId === 'basic-info') {
      completion = getBasicInfoCompletion();
    } else {
      completion = getSectionCompletion(sectionId as DueDiligenceSection);
    }
    
    if (completion.is_completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (completion.completion_percentage > 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSectionStatus = (sectionId: string) => {
    let completion;
    if (sectionId === 'basic-info') {
      completion = getBasicInfoCompletion();
    } else {
      completion = getSectionCompletion(sectionId as DueDiligenceSection);
    }
    
    if (completion.is_completed) return 'Complete';
    if (completion.completion_percentage > 0) return 'In Progress';
    return 'Not Started';
  };

  const getSectionVariant = (sectionId: string) => {
    let completion;
    if (sectionId === 'basic-info') {
      completion = getBasicInfoCompletion();
    } else {
      completion = getSectionCompletion(sectionId as DueDiligenceSection);
    }
    
    if (completion.is_completed) return 'default';
    if (completion.completion_percentage > 0) return 'secondary';
    return 'outline';
  };

  const renderSectionContent = () => {
    if (!institution?.id) return null;

    switch (activeSection) {
      case 'basic-info':
        return (
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
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button 
                onClick={handleSave} 
                disabled={updating || !formData.name.trim()}
                className="min-w-[120px]"
              >
                 {updating ? (
                   <div className="flex items-center gap-2">
                     <LoadingSpinner size="sm" />
                     Saving...
                   </div>
                 ) : (
                   'Save Changes'
                 )}
              </Button>
            </div>
          </Card>
        );
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
      <div className="container-content">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="container-content">
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
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <Sidebar className="w-80 border-r">
          <SidebarContent>
            {/* Header */}
            <div className="p-4 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 w-full justify-start"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
              <div className="flex items-center gap-2 mt-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-bold">Institutional Profile</h1>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="p-4 border-b">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Overall Progress</div>
                  <div className="text-lg font-bold text-primary">
                    {progressLoading ? (
                       <LoadingSpinner size="sm" />
                     ) : (
                       `${overallProgress}%`
                     )}
                  </div>
                </div>
                <Progress value={overallProgress} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  {progressLoading ? '...' : `${completedSections}/${sections.length} sections completed`}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <SidebarGroup>
              <SidebarGroupLabel>Due Diligence Sections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveSection(section.id)}
                        isActive={activeSection === section.id}
                        className="w-full justify-start"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getSectionIcon(section.id)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{section.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {getSectionStatus(section.id)}
                            </div>
                          </div>
                          <Badge variant={getSectionVariant(section.id)} className="text-xs">
                            {section.id === 'basic-info' 
                              ? `${getBasicInfoCompletion().completion_percentage}%`
                              : `${getSectionCompletion(section.id as DueDiligenceSection).completion_percentage}%`
                            }
                          </Badge>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content Header */}
          <div className="p-6 border-b bg-background">
            <SidebarTrigger className="md:hidden mb-4" />
            {activeSection !== 'basic-info' && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    {getSectionIcon(activeSection)}
                    {sections.find(s => s.id === activeSection)?.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {sections.find(s => s.id === activeSection)?.description}
                  </p>
                </div>
                <Badge variant={getSectionVariant(activeSection)} className="text-sm">
                  {getSectionStatus(activeSection)}
                </Badge>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              {renderSectionContent()}
              
              {/* Institution Overview - Only show on basic-info */}
              {activeSection === 'basic-info' && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Institution Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <div className="text-2xl font-bold">{institution.member_count || 0}</div>
                        <div className="text-sm text-muted-foreground">Members</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Building2 className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm font-medium">
                          KYB Status: <Badge variant={institution.kyb_status === 'verified' ? 'default' : 'outline'}>
                            {institution.kyb_status === 'verified' ? 'Verified' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(institution.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}