import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useLicenses } from '@/hooks/useLicenses';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, AlertCircle, CheckCircle, Shuffle, X, Building2 } from 'lucide-react';
import { KycStatusIndicator } from '@/components/kyc/KycStatusIndicator';
import { KycVerificationModal } from '@/components/kyc/KycVerificationModal';
import { sanitizeText, validateAvatarUrl, sanitizeDisplayName } from '@/components/ui/input-sanitizer';
import { FileUpload } from '@/components/ui/file-upload';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/errorHandler';
import { notifications } from '@/lib/notifications';
import { InstitutionCreationDialog } from '@/components/institution/InstitutionCreationDialog';
import { useInstitution } from '@/hooks/useInstitution';

interface Profile {
  id: string;
  display_name: string;
  description?: string;
  avatar?: string;
  wallet_address?: string;
  is_public: boolean;
  reputation: number;
  successful_trades: number;
  total_trades: number;
  kyc_level?: 'Level 0' | 'Level 1' | 'Level 2';
  trader_type?: 'Degen' | 'Institutional';
  licenses?: string[];
  institution_id?: string;
}

export default function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarValidation, setAvatarValidation] = useState<{ isValid: boolean; error?: string } | null>(null);
  const [avatarMode, setAvatarMode] = useState<'url' | 'upload'>('url');
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isInstitutionDialogOpen, setIsInstitutionDialogOpen] = useState(false);
  const { user, session } = useAuth();
  const { isUserOnline } = useOnlinePresence();
  const { licenses } = useLicenses();
  const { institution, refetch: refetchInstitution } = useInstitution();

  console.log('🔍 ProfileManager - institution data:', {
    institution,
    hasInstitution: !!institution,
    institutionName: institution?.name,
    isAdmin: institution?.is_admin
  });

  // Derive trader type from institution presence - institution members are always Institutional
  const effectiveTraderType = institution ? 'Institutional' : (profile?.trader_type || 'Degen');

  console.log('🔍 ProfileManager - UI logic:', {
    effectiveTraderType,
    showCreateButton: effectiveTraderType === 'Institutional' && !institution,
    showEditButton: !!institution && institution.is_admin
  });


  // Random avatar generation options
  const avatarOptions = {
    avatarStyle: ["Circle", "Transparent"],
    topType: [
      "NoHair", "Eyepatch", "Hat", "Hijab", "Turban", "WinterHat1", "WinterHat2", "WinterHat3", "WinterHat4",
      "LongHairBigHair", "LongHairBob", "LongHairBun", "LongHairCurly", "LongHairCurvy", "LongHairDreads",
      "LongHairFrida", "LongHairFro", "LongHairFroBand", "LongHairNotTooLong", "LongHairShavedSides",
      "LongHairMiaWallace", "LongHairStraight", "LongHairStraight2", "LongHairStraightStrand",
      "ShortHairDreads01", "ShortHairDreads02", "ShortHairFrizzle", "ShortHairShaggyMullet", "ShortHairShortCurly",
      "ShortHairShortFlat", "ShortHairShortRound", "ShortHairShortWaved", "ShortHairSides",
      "ShortHairTheCaesar", "ShortHairTheCaesarSidePart"
    ],
    accessoriesType: ["Blank", "Kurt", "Prescription01", "Prescription02", "Round", "Sunglasses", "Wayfarers"],
    hairColor: ["Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "PastelPink", "Blue", "Platinum", "Red", "SilverGray"],
    facialHairType: ["Blank", "BeardMedium", "BeardLight", "BeardMajestic", "MoustacheFancy", "MoustacheMagnum"],
    facialHairColor: ["Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "Platinum", "Red"],
    clotheType: ["BlazerShirt", "BlazerSweater", "CollarSweater", "GraphicShirt", "Hoodie", "Overall", "ShirtCrewNeck", "ShirtScoopNeck", "ShirtVNeck"],
    clotheColor: [
      "Black", "Blue01", "Blue02", "Blue03", "Gray01", "Gray02", "Heather", "PastelBlue", "PastelGreen",
      "PastelOrange", "PastelRed", "PastelYellow", "Pink", "Red", "White"
    ],
    graphicType: ["Bat", "Cumbia", "Deer", "Diamond", "Hola", "Pizza", "Resist", "Selena", "Bear", "SkullOutline", "Skull"],
    eyeType: ["Close", "Cry", "Default", "Dizzy", "EyeRoll", "Happy", "Hearts", "Side", "Squint", "Surprised", "Wink", "WinkWacky"],
    eyebrowType: [
      "Angry", "AngryNatural", "Default", "DefaultNatural", "FlatNatural", "RaisedExcited", "RaisedExcitedNatural",
      "SadConcerned", "SadConcernedNatural", "UnibrowNatural", "UpDown", "UpDownNatural"
    ],
    mouthType: [
      "Concerned", "Default", "Disbelief", "Eating", "Grimace", "Sad", "ScreamOpen", "Serious", "Smile", "Tongue", "Twinkle", "Vomit"
    ],
    skinColor: ["Tanned", "Yellow", "Pale", "Light", "Brown", "DarkBrown", "Black"]
  };

  const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const generateRandomAvatar = () => {
    const params = Object.entries(avatarOptions)
      .map(([key, values]) => `${key}=${getRandomElement(values)}`)
      .join("&");
    
    return `https://avataaars.io/?${params}`;
  };

  const handleRandomAvatar = () => {
    const randomAvatarUrl = generateRandomAvatar();
    handleAvatarChange(randomAvatarUrl);
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create initial profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            display_name: user.email?.split('@')[0] || 'Anonymous',
            is_public: true
          }])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (error) {
      const appError = errorHandler.handle(error, false);
      logger.error('Error fetching profile', { 
        component: 'ProfileManager',
        operation: 'fetchProfile',
        userId: user?.id 
      }, appError);
      notifications.error({
        title: "Error loading profile",
        description: "Failed to load your profile information"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl: string) => {
    logger.userAction('Avatar changed', { 
      component: 'ProfileManager',
      operation: 'handleAvatarChange',
      userId: user?.id,
      hasNewAvatar: !!newAvatarUrl 
    });
    
    // Update profile state immediately
    setProfile(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
    
    // Track pending upload URL
    setPendingAvatarUrl(newAvatarUrl);
    
    // Skip validation for Supabase storage URLs (they're trusted)
    const isSupabaseUrl = newAvatarUrl.includes('supabase') || newAvatarUrl.includes('storage');
    
    if (newAvatarUrl.trim() && !isSupabaseUrl) {
      const validation = validateAvatarUrl(newAvatarUrl);
      setAvatarValidation({ isValid: validation.isValid, error: validation.error });
    } else {
      setAvatarValidation(null);
    }
  };

  const handleAvatarSaved = (success: boolean) => {
    logger.userAction('Avatar save completed', { 
      component: 'ProfileManager',
      operation: 'handleAvatarSaved',
      userId: user?.id,
      success 
    });
    if (success) {
      setPendingAvatarUrl(null);
      notifications.success({
        title: "Avatar updated",
        description: "Your profile image has been saved automatically."
      });
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    // Check avatar validation before saving - only if we have an avatar and validation failed
    if (profile.avatar && avatarValidation && !avatarValidation.isValid) {
      notifications.error({
        title: "Invalid avatar URL",
        description: avatarValidation.error || "Please fix the avatar URL before saving"
      });
      return;
    }

    logger.userAction('Saving profile', { 
      component: 'ProfileManager',
      operation: 'handleSave',
      userId: user?.id,
      hasAvatar: !!profile.avatar 
    });

    setSaving(true);
    try {
      // Use the current avatar URL from state (may already be saved for uploads)
      let avatarUrl = null;
      if (profile.avatar && profile.avatar.trim()) {
        avatarUrl = profile.avatar.trim().length <= 500 ? profile.avatar.trim() : null;
      }

      const sanitizedProfile = {
        display_name: sanitizeDisplayName(profile.display_name),
        description: sanitizeText(profile.description || '', 500),
        avatar: avatarUrl,
        is_public: profile.is_public,
        
        trader_type: profile.trader_type || 'Degen',
        licenses: profile.licenses || [],
      };

      const { error } = await supabase
        .from('profiles')
        .update(sanitizedProfile)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state with sanitized values
      setProfile(prev => prev ? { ...prev, ...sanitizedProfile } : null);

      logger.userAction('Profile saved successfully', { 
        component: 'ProfileManager',
        operation: 'handleSave',
        userId: user?.id 
      });
      notifications.success({
        title: "Profile updated",
        description: "Your profile has been saved successfully"
      });
    } catch (error) {
      const appError = errorHandler.handle(error, false);
      logger.error('Error saving profile', { 
        component: 'ProfileManager',
        operation: 'handleSave',
        userId: user?.id 
      }, appError);
      notifications.error({
        title: "Error saving profile",
        description: "Failed to save your profile changes"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Please connect your wallet to manage your profile
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Failed to load profile
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Manage your profile information and privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback>
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user && isUserOnline(user.id) && (
                <div className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="flex-1">
              <Label>Profile Image</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Upload an image or use a URL
              </p>
            </div>
          </div>
          
          {/* Avatar Input Mode Toggle */}
          <div className="space-y-3">
            <Label>Avatar Input Method</Label>
            <RadioGroup
              value={avatarMode}
              onValueChange={(value) => setAvatarMode(value as 'url' | 'upload')}
              className="flex flex-row gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url-mode" />
                <Label htmlFor="url-mode">Avatar URL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload-mode" />
                <Label htmlFor="upload-mode">Image Upload</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Avatar Input */}
          {avatarMode === 'upload' ? (
            <FileUpload
              currentImage={profile.avatar}
              onImageUpload={handleAvatarChange}
              onImageSaved={handleAvatarSaved}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <div className="flex gap-2">
                <Input
                  id="avatar"
                  value={profile.avatar || ''}
                  onChange={(e) => handleAvatarChange(e.target.value)}
                  placeholder="Enter avatar URL"
                  className={`flex-1 ${avatarValidation && !avatarValidation.isValid ? 'border-destructive' : ''}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={handleRandomAvatar}
                  className="shrink-0"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random
                </Button>
              </div>
              {avatarValidation && (
                <div className={`flex items-center gap-2 text-sm ${avatarValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                  {avatarValidation.isValid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {avatarValidation.isValid ? 'Valid avatar URL' : avatarValidation.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <Label htmlFor="description">Bio</Label>
            <Textarea
              id="description"
              value={profile.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Tell others about yourself..."
              rows={3}
            />
          </div>

          <div>
            <Label>Wallet Address</Label>
            <Input
              value={profile.wallet_address || 'Not connected'}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        {/* Trading Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Trading Information</h3>
          
          <KycStatusIndicator 
            onStartVerification={() => setShowKycModal(true)}
          />

           <div>
            <Label>Trader Type</Label>
            <RadioGroup
              value={effectiveTraderType}
              onValueChange={(value) => setProfile({ ...profile, trader_type: value as 'Degen' | 'Institutional' })}
              className="flex flex-row gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="Degen" 
                  id="degen" 
                  disabled={!!institution} // Disable if user has institution
                />
                <Label 
                  htmlFor="degen" 
                  className={institution ? "text-muted-foreground" : ""}
                >
                  Degen Trader
                  {institution && <span className="text-xs block">(Locked to Institutional)</span>}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Institutional" id="institutional" />
                <Label htmlFor="institutional">Institutional</Label>
              </div>
            </RadioGroup>
            
            {/* Institution Creation Button */}
            {effectiveTraderType === 'Institutional' && !institution && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInstitutionDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Create Institutional Profile
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Set up your institution profile and manage team members
                </p>
              </div>
            )}
            
            {/* Institution Info Display & Edit Button */}
            {institution && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{institution.name}</span>
                  </div>
                  {institution.is_admin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/institution-settings'}
                      className="h-7 px-2 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Role: {institution.is_admin ? 'Administrator' : 'Member'}</p>
                  <p>{institution.member_count} members</p>
                </div>
                {institution.is_admin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/institution-settings'}
                    className="flex items-center gap-2 mt-2 w-full"
                  >
                    <Building2 className="h-4 w-4" />
                    Edit Institutional Profile
                  </Button>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Professional Licenses</Label>
            <div className="space-y-3">
              {profile.licenses && profile.licenses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.licenses.map(licenseId => {
                    const license = licenses.find(l => l.id === licenseId);
                    return license ? (
                      <Badge key={licenseId} variant="secondary" className="flex items-center gap-1">
                        {license.licenseName} ({license.region})
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => setProfile({
                            ...profile,
                            licenses: profile.licenses?.filter(id => id !== licenseId) || []
                          })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              
              <Select 
                value="" 
                onValueChange={(value) => {
                  if (value && !profile.licenses?.includes(value)) {
                    setProfile({
                      ...profile,
                      licenses: [...(profile.licenses || []), value]
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add a license" />
                </SelectTrigger>
                <SelectContent>
                  {licenses
                    .filter(license => !profile.licenses?.includes(license.id))
                    .map(license => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.region} - {license.licenseName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={profile.is_public}
              onCheckedChange={(checked) => setProfile({ ...profile, is_public: checked })}
            />
            <Label htmlFor="isPublic">Make profile visible to other traders</Label>
          </div>
        </div>


        {/* Trading Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.reputation}</div>
            <div className="text-sm text-muted-foreground">Reputation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{profile.successful_trades}</div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{profile.total_trades}</div>
            <div className="text-sm text-muted-foreground">Total Trades</div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Profile'
          )}
        </Button>

        <KycVerificationModal
          open={showKycModal}
          onOpenChange={setShowKycModal}
          currentKycLevel={profile?.kyc_level}
        />

        {/* Institution Creation Dialog */}
        <InstitutionCreationDialog
          open={isInstitutionDialogOpen}
          onOpenChange={setIsInstitutionDialogOpen}
          onSuccess={() => {
            refetchInstitution();
            notifications.success({
              title: "Success",
              description: "Institution profile created successfully!",
            });
          }}
        />
      </CardContent>
    </Card>
  );
}