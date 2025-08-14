import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { CorporateProfile, Contact, OwnershipEntry, DueDiligenceSection, SectionCompletion, StructuredAddress } from '@/types/dueDiligence';
import { LEI_REGEX, ISO_COUNTRY_REGEX, LEGAL_FORMS, CONTACT_ROLES } from '@/types/dueDiligence';

interface CorporateProfileSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function CorporateProfileSection({ institutionId, onSectionUpdate }: CorporateProfileSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [corporateProfile, setCorporateProfile] = useState<Partial<CorporateProfile>>({
    institution_id: institutionId,
    legal_name: '',
    trading_name: '',
    lei: '',
    legal_form: '',
    registration_number: '',
    registry_name: '',
    incorporation_date: undefined,
    incorporation_country: '',
    principal_address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    },
    website: '',
    organizational_chart_url: ''
  });

  const [contacts, setContacts] = useState<Contact[]>([{
    role: 'Compliance Officer',
    name: '',
    email: '',
    phone: ''
  }]);

  const [ownership, setOwnership] = useState<OwnershipEntry[]>([]);

  // Validation
  const validateLEI = (lei: string) => {
    if (!lei) return true; // LEI is optional
    return LEI_REGEX.test(lei);
  };

  const validateCountry = (country: string) => {
    if (!country) return false;
    return ISO_COUNTRY_REGEX.test(country);
  };

  const calculateCompletionPercentage = () => {
    const requiredFields = [
      corporateProfile.legal_name,
      corporateProfile.registration_number,
      corporateProfile.registry_name,
      corporateProfile.incorporation_country,
      corporateProfile.principal_address?.street,
      corporateProfile.principal_address?.city,
      corporateProfile.principal_address?.postal_code,
      corporateProfile.principal_address?.country
    ];
    
    const contactComplete = contacts.some(contact => 
      contact.name && contact.email && contact.role
    );
    
    const completedFields = requiredFields.filter(Boolean).length;
    const totalFields = requiredFields.length + (contactComplete ? 1 : 0);
    
    return Math.round((completedFields / (requiredFields.length + 1)) * 100);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (!corporateProfile.legal_name) {
        throw new Error('Legal name is required');
      }
      
      if (!corporateProfile.registration_number) {
        throw new Error('Registration number is required');
      }
      
      if (!corporateProfile.registry_name) {
        throw new Error('Registry name is required');
      }
      
      if (corporateProfile.lei && !validateLEI(corporateProfile.lei)) {
        throw new Error('Invalid LEI format. Must be 20 alphanumeric characters.');
      }
      
      if (corporateProfile.incorporation_country && !validateCountry(corporateProfile.incorporation_country)) {
        throw new Error('Invalid country code. Must be ISO 3166-1 alpha-2 format.');
      }

      // TODO: Implement actual save to Supabase
      console.log('Saving corporate profile:', { corporateProfile, contacts, ownership });
      
      const completionPercentage = calculateCompletionPercentage();
      const isCompleted = completionPercentage === 100;
      
      const completion: SectionCompletion = {
        institution_id: institutionId,
        section_name: 'corporate_profile',
        is_completed: isCompleted,
        completion_percentage: completionPercentage,
        last_updated_at: new Date()
      };
      
      onSectionUpdate('corporate_profile', completion);
      
      toast({
        title: "Success",
        description: "Corporate profile section saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save corporate profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    setContacts([...contacts, {
      role: 'Other',
      name: '',
      email: '',
      phone: ''
    }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const addOwnership = () => {
    setOwnership([...ownership, {
      holder_name: '',
      holder_type: 'legal_entity',
      country: '',
      percentage: 0,
      is_ubo: false,
      documents: []
    }]);
  };

  const removeOwnership = (index: number) => {
    setOwnership(ownership.filter((_, i) => i !== index));
  };

  const updateOwnership = (index: number, field: keyof OwnershipEntry, value: any) => {
    const updated = [...ownership];
    updated[index] = { ...updated[index], [field]: value };
    setOwnership(updated);
  };

  return (
    <div className="space-y-6">
      {/* Basic Corporate Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Corporate Information</CardTitle>
          <CardDescription>
            Core legal entity details and registration information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name *</Label>
              <Input
                id="legal_name"
                value={corporateProfile.legal_name}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, legal_name: e.target.value }))}
                placeholder="Enter legal entity name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trading_name">Trading/Brand Name</Label>
              <Input
                id="trading_name"
                value={corporateProfile.trading_name}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, trading_name: e.target.value }))}
                placeholder="Enter trading or brand name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lei">LEI (Legal Entity Identifier)</Label>
              <Input
                id="lei"
                value={corporateProfile.lei}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, lei: e.target.value.toUpperCase() }))}
                placeholder="20 alphanumeric characters"
                maxLength={20}
                className={corporateProfile.lei && !validateLEI(corporateProfile.lei) ? 'border-destructive' : ''}
              />
              {corporateProfile.lei && !validateLEI(corporateProfile.lei) && (
                <p className="text-sm text-destructive">Invalid LEI format</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="legal_form">Legal Form</Label>
              <Select
                value={corporateProfile.legal_form}
                onValueChange={(value) => setCorporateProfile(prev => ({ ...prev, legal_form: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select legal form" />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_FORMS.map((form) => (
                    <SelectItem key={form} value={form}>{form}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration Number *</Label>
              <Input
                id="registration_number"
                value={corporateProfile.registration_number}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, registration_number: e.target.value }))}
                placeholder="Enter registration number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="registry_name">Registry Name *</Label>
              <Input
                id="registry_name"
                value={corporateProfile.registry_name}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, registry_name: e.target.value }))}
                placeholder="Enter registry name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date of Incorporation</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !corporateProfile.incorporation_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {corporateProfile.incorporation_date ? (
                      format(corporateProfile.incorporation_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={corporateProfile.incorporation_date}
                    onSelect={(date) => setCorporateProfile(prev => ({ ...prev, incorporation_date: date }))}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="incorporation_country">Country of Incorporation</Label>
              <Input
                id="incorporation_country"
                value={corporateProfile.incorporation_country}
                onChange={(e) => setCorporateProfile(prev => ({ ...prev, incorporation_country: e.target.value.toUpperCase() }))}
                placeholder="US, GB, DE, etc."
                maxLength={2}
                className={corporateProfile.incorporation_country && !validateCountry(corporateProfile.incorporation_country) ? 'border-destructive' : ''}
              />
              {corporateProfile.incorporation_country && !validateCountry(corporateProfile.incorporation_country) && (
                <p className="text-sm text-destructive">Invalid country code (ISO 3166-1 alpha-2)</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={corporateProfile.website}
              onChange={(e) => setCorporateProfile(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Principal Business Address */}
      <Card>
        <CardHeader>
          <CardTitle>Principal Business Address</CardTitle>
          <CardDescription>
            Main business address for the legal entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_street">Street Address *</Label>
            <Input
              id="address_street"
              value={corporateProfile.principal_address?.street || ''}
              onChange={(e) => setCorporateProfile(prev => ({ 
                ...prev, 
                principal_address: { ...prev.principal_address, street: e.target.value } as StructuredAddress
              }))}
              placeholder="Enter street address"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">City *</Label>
              <Input
                id="address_city"
                value={corporateProfile.principal_address?.city || ''}
                onChange={(e) => setCorporateProfile(prev => ({ 
                  ...prev, 
                  principal_address: { ...prev.principal_address, city: e.target.value } as StructuredAddress
                }))}
                placeholder="Enter city"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_state">State/Province</Label>
              <Input
                id="address_state"
                value={corporateProfile.principal_address?.state || ''}
                onChange={(e) => setCorporateProfile(prev => ({ 
                  ...prev, 
                  principal_address: { ...prev.principal_address, state: e.target.value } as StructuredAddress
                }))}
                placeholder="Enter state/province"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_postal">Postal Code *</Label>
              <Input
                id="address_postal"
                value={corporateProfile.principal_address?.postal_code || ''}
                onChange={(e) => setCorporateProfile(prev => ({ 
                  ...prev, 
                  principal_address: { ...prev.principal_address, postal_code: e.target.value } as StructuredAddress
                }))}
                placeholder="Enter postal code"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address_country">Country *</Label>
            <Input
              id="address_country"
              value={corporateProfile.principal_address?.country || ''}
              onChange={(e) => setCorporateProfile(prev => ({ 
                ...prev, 
                principal_address: { ...prev.principal_address, country: e.target.value.toUpperCase() } as StructuredAddress
              }))}
              placeholder="US, GB, DE, etc."
              maxLength={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Key Contacts</CardTitle>
          <CardDescription>
            Primary contacts for compliance, operations, and management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.map((contact, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Contact {index + 1}</h4>
                {contacts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={contact.role}
                    onValueChange={(value) => updateContact(index, 'role', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    placeholder="Enter contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Phone (E.164 format)</Label>
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button variant="outline" onClick={addContact} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
          <CardDescription>
            Upload certificate of incorporation and organizational chart
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Certificate of Incorporation / Registry Extract</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop<br />
                PDF, PNG, or JPG (max 25MB)
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Organizational Chart (Optional)</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop<br />
                PDF, PNG, or JPG (max 25MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Corporate Profile'}
        </Button>
      </div>
    </div>
  );
}