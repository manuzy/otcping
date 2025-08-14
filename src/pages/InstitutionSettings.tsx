import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, ArrowLeft, Users, Settings, Save, FileText, CheckCircle2, Clock } from 'lucide-react';
import { useInstitution, useInstitutionUpdate } from '@/hooks/useInstitution';
import { useAuth } from '@/hooks/useAuth';
import { notifications } from '@/lib/notifications';
import { sanitizeText, sanitizeDisplayName } from '@/components/ui/input-sanitizer';
import { InstitutionCreationData } from '@/types/institution';
import { useSectionCompletion } from '@/hooks/useSectionCompletion';

export default function InstitutionSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { institution, loading, refetch } = useInstitution();
  const { updateInstitution, loading: updating } = useInstitutionUpdate();
  const { overallProgress, completedSections, loading: progressLoading } = useSectionCompletion(institution?.id || '');
  
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
        description: "Only institution administrators can edit settings.",
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
        description: "Institution settings updated successfully!",
      });
      
      refetch();
    } catch (error) {
      console.error('Failed to update institution:', error);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
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
    <div className="container max-w-4xl mx-auto p-6">
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
          <h1 className="text-2xl font-bold">Institution Settings</h1>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
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
          </CardContent>
        </Card>

        {/* Public Information */}
        <Card>
          <CardHeader>
            <CardTitle>Public Information</CardTitle>
            <CardDescription>
              Information visible to other traders and partners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Private Information */}
        <Card>
          <CardHeader>
            <CardTitle>Private Information</CardTitle>
            <CardDescription>
              Confidential information only visible to institution members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        </Card>

        {/* Due Diligence Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Due Diligence
            </CardTitle>
            <CardDescription>
              Complete institutional due diligence requirements for regulatory compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {progressLoading ? '...' : `${completedSections}/9`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {overallProgress === 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {overallProgress === 100 ? 'Complete' : 'In Progress'}
                </span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/institution-due-diligence')} 
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2 h-4 w-4" />
              {overallProgress === 0 ? 'Start Due Diligence' : 'Continue Due Diligence'}
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

        {/* Save Button */}
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
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}