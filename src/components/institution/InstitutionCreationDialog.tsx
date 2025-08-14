import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Upload, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useInstitutionCreation } from '@/hooks/useInstitution';
import { InstitutionCreationData } from '@/types/institution';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';

interface InstitutionCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const steps = [
  { id: 1, title: 'Basic Information', description: 'Company name and description' },
  { id: 2, title: 'Branding', description: 'Logo and visual identity' },
  { id: 3, title: 'Public Profile', description: 'Information visible to all users' },
  { id: 4, title: 'Private Details', description: 'Information visible to contacts only' },
  { id: 5, title: 'Review & Create', description: 'Confirm and create institution' }
];

export const InstitutionCreationDialog: React.FC<InstitutionCreationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<InstitutionCreationData>({
    name: '',
    description: '',
    logo: '',
    public_description: '',
    private_description: ''
  });
  
  const { createInstitution, loading, error } = useInstitutionCreation();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: keyof InstitutionCreationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await createInstitution(formData);
      toast({
        title: "Institution Created",
        description: "Your institutional profile has been created successfully.",
      });
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        logo: '',
        public_description: '',
        private_description: ''
      });
      setCurrentStep(1);
    } catch (err) {
      // Error already handled by hook
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return true; // Logo is optional
      case 3:
        return true; // Public description is optional
      case 4:
        return true; // Private description is optional
      case 5:
        return formData.name.trim().length > 0;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Institution Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your institution name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">General Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your institution"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="logo">Logo URL</Label>
              <div className="mt-1 space-y-2">
                <Input
                  id="logo"
                  type="url"
                  value={formData.logo || ''}
                  onChange={(e) => handleInputChange('logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-muted-foreground">
                  Provide a URL to your institution's logo. Recommended size: 200x200px.
                </p>
              </div>
            </div>
            {formData.logo && (
              <div className="mt-4">
                <Label>Logo Preview</Label>
                <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                  <img
                    src={formData.logo}
                    alt="Logo preview"
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Eye className="h-4 w-4" />
              <span>This information will be visible to all authenticated users</span>
            </div>
            <div>
              <Label htmlFor="public_description">Public Description</Label>
              <Textarea
                id="public_description"
                value={formData.public_description || ''}
                onChange={(e) => handleInputChange('public_description', e.target.value)}
                placeholder="Information you want to share publicly about your institution"
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                This will be shown on your institution's public profile.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <EyeOff className="h-4 w-4" />
              <span>This information will only be visible to your approved contacts</span>
            </div>
            <div>
              <Label htmlFor="private_description">Private Description</Label>
              <Textarea
                id="private_description"
                value={formData.private_description || ''}
                onChange={(e) => handleInputChange('private_description', e.target.value)}
                placeholder="Detailed information for approved contacts only"
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                This information is only shared with users you've added to your contacts.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Your Institution</h3>
              <p className="text-muted-foreground">
                Please review the information below before creating your institution.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {formData.name}
                </CardTitle>
                {formData.description && (
                  <CardDescription>{formData.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.logo && (
                  <div>
                    <Label className="text-sm font-medium">Logo</Label>
                    <div className="mt-1">
                      <img
                        src={formData.logo}
                        alt="Institution logo"
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                  </div>
                )}
                
                {formData.public_description && (
                  <div>
                    <Label className="text-sm font-medium">Public Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.public_description}
                    </p>
                  </div>
                )}
                
                {formData.private_description && (
                  <div>
                    <Label className="text-sm font-medium">Private Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.private_description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create Institutional Profile
            </DialogTitle>
            <DialogDescription>
              Set up your institution profile in {steps.length} easy steps
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex justify-between mb-6">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center space-y-1 ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <span className="text-xs text-center max-w-20">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {loading ? (
              <LoadingState text="Creating institution..." />
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">{steps[currentStep - 1]?.title}</h3>
                <p className="text-muted-foreground mb-6">{steps[currentStep - 1]?.description}</p>
                
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                {renderStepContent()}
              </>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              
              {currentStep === steps.length ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid() || loading}
                >
                  Create Institution
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid() || loading}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};