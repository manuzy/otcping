import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { CorporateProfile, Contact, OwnershipEntry, DueDiligenceSection, SectionCompletion, StructuredAddress } from '@/types/dueDiligence';
import { LEI_REGEX, ISO_COUNTRY_REGEX, LEGAL_FORMS, CONTACT_ROLES } from '@/types/dueDiligence';
import { useCorporateProfile } from '@/hooks/useCorporateProfile';
import { Badge } from '@/components/ui/badge';

interface CorporateProfileSectionProps {
  institutionId: string;
  onSectionUpdate: (sectionName: DueDiligenceSection, completion: SectionCompletion) => void;
}

export default function CorporateProfileSection({ institutionId, onSectionUpdate }: CorporateProfileSectionProps) {
  const { toast } = useToast();
  const { data, loading, saving, error, updateData, saveData } = useCorporateProfile(institutionId);
  
  // Extract data for easier access
  const corporateProfile = data.profile;
  const contacts = data.contacts;
  const ownership = data.ownership;

  // Track progress automatically without notifications
  React.useEffect(() => {
    if (!corporateProfile || !Object.keys(corporateProfile).length) return;
    
    const percentage = calculateCompletionPercentage();
    const isCompleted = percentage >= 80;

    const timeoutId = setTimeout(() => {
      onSectionUpdate('corporate_profile', {
        institution_id: institutionId,
        section_name: 'corporate_profile',
        is_completed: isCompleted,
        completion_percentage: percentage,
        last_updated_at: new Date()
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [corporateProfile, contacts, onSectionUpdate, institutionId]);

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
    
    return Math.round((completedFields / (requiredFields.length + 1)) * 100);
  };

  const handleSave = async () => {
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

      // Save to database
      await saveData(data);
      
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
    }
  };

  const addContact = () => {
    const newContacts = [...contacts, {
      role: 'Other' as Contact['role'],
      name: '',
      email: '',
      phone: ''
    }];
    updateData({ contacts: newContacts });
  };

  const removeContact = (index: number) => {
    const newContacts = contacts.filter((_, i) => i !== index);
    updateData({ contacts: newContacts });
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ contacts: updated });
  };

  const addOwnership = () => {
    const newOwnership = [...ownership, {
      holder_name: '',
      holder_type: 'legal_entity' as OwnershipEntry['holder_type'],
      country: '',
      percentage: 0,
      is_ubo: false,
      documents: []
    }];
    updateData({ ownership: newOwnership });
  };

  const removeOwnership = (index: number) => {
    const newOwnership = ownership.filter((_, i) => i !== index);
    updateData({ ownership: newOwnership });
  };

  const updateOwnership = (index: number, field: keyof OwnershipEntry, value: any) => {
    const updated = [...ownership];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ ownership: updated });
  };

  const updateProfile = (field: keyof CorporateProfile, value: any) => {
    updateData({ profile: { ...corporateProfile, [field]: value } });
  };

  const updateAddress = (field: string, value: string) => {
    updateData({ 
      profile: { 
        ...corporateProfile, 
        principal_address: { ...corporateProfile.principal_address, [field]: value } 
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-save indicator */}
      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
      
      {error && (
        <Badge variant="destructive" className="mb-4">
          Error: {error}
        </Badge>
      )}
      {/* Basic Corporate Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Corporate Information</CardTitle>
          <CardDescription>
            Core legal entity details and registration information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid-responsive">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name *</Label>
              <Input
                id="legal_name"
                value={corporateProfile.legal_name}
                onChange={(e) => updateProfile('legal_name', e.target.value)}
                placeholder="Enter legal entity name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trading_name">Trading/Brand Name</Label>
              <Input
                id="trading_name"
                value={corporateProfile.trading_name}
                onChange={(e) => updateProfile('trading_name', e.target.value)}
                placeholder="Enter trading or brand name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lei">LEI (Legal Entity Identifier)</Label>
              <Input
                id="lei"
                value={corporateProfile.lei}
                onChange={(e) => updateProfile('lei', e.target.value.toUpperCase())}
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
                onValueChange={(value) => updateProfile('legal_form', value)}
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
                onChange={(e) => updateProfile('registration_number', e.target.value)}
                placeholder="Enter registration number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="registry_name">Registry Name *</Label>
              <Input
                id="registry_name"
                value={corporateProfile.registry_name}
                onChange={(e) => updateProfile('registry_name', e.target.value)}
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
                    onSelect={(date) => updateProfile('incorporation_date', date)}
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
                onChange={(e) => updateProfile('incorporation_country', e.target.value.toUpperCase())}
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
              onChange={(e) => updateProfile('website', e.target.value)}
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
              onChange={(e) => updateAddress('street', e.target.value)}
              placeholder="Enter street address"
            />
          </div>
          
          <div className="grid-responsive-3">
            <div className="space-y-2">
              <Label htmlFor="address_city">City *</Label>
              <Input
                id="address_city"
                value={corporateProfile.principal_address?.city || ''}
                onChange={(e) => updateAddress('city', e.target.value)}
                placeholder="Enter city"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_state">State/Province</Label>
              <Input
                id="address_state"
                value={corporateProfile.principal_address?.state || ''}
                onChange={(e) => updateAddress('state', e.target.value)}
                placeholder="Enter state/province"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_postal">Postal Code *</Label>
              <Input
                id="address_postal"
                value={corporateProfile.principal_address?.postal_code || ''}
                onChange={(e) => updateAddress('postal_code', e.target.value)}
                placeholder="Enter postal code"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address_country">Country *</Label>
            <Input
              id="address_country"
              value={corporateProfile.principal_address?.country || ''}
              onChange={(e) => updateAddress('country', e.target.value.toUpperCase())}
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
            <div key={index} className="card-base">
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
              
              <div className="grid-responsive">
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
            <div className="card-input">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop<br />
                PDF, PNG, or JPG (max 25MB)
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Organizational Chart (Optional)</Label>
            <div className="card-input">
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