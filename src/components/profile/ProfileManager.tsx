import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, AlertCircle, CheckCircle } from 'lucide-react';
import { sanitizeText, validateAvatarUrl, sanitizeDisplayName } from '@/components/ui/input-sanitizer';

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
}

export default function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarValidation, setAvatarValidation] = useState<{ isValid: boolean; error?: string } | null>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { isUserOnline } = useOnlinePresence();

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
            is_public: false
          }])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error loading profile",
        description: "Failed to load your profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl: string) => {
    setProfile({ ...profile!, avatar: newAvatarUrl });
    
    // Validate avatar URL in real-time
    if (newAvatarUrl.trim()) {
      const validation = validateAvatarUrl(newAvatarUrl);
      setAvatarValidation({ isValid: validation.isValid, error: validation.error });
    } else {
      setAvatarValidation(null);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    // Check avatar validation before saving
    if (profile.avatar && avatarValidation && !avatarValidation.isValid) {
      toast({
        title: "Invalid avatar URL",
        description: avatarValidation.error || "Please fix the avatar URL before saving",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Sanitize inputs before saving
      const avatarValidationResult = validateAvatarUrl(profile.avatar || '');
      const sanitizedProfile = {
        display_name: sanitizeDisplayName(profile.display_name),
        description: sanitizeText(profile.description || '', 500),
        avatar: avatarValidationResult.url,
        is_public: profile.is_public,
      };

      const { error } = await supabase
        .from('profiles')
        .update(sanitizedProfile)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state with sanitized values
      setProfile(prev => prev ? { ...prev, ...sanitizedProfile } : null);

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Failed to save your profile changes",
        variant: "destructive",
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
          <div className="flex-1 space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <div className="space-y-2">
              <Input
                id="avatar"
                value={profile.avatar || ''}
                onChange={(e) => handleAvatarChange(e.target.value)}
                placeholder="https://ui-avatars.com/api/?name=YourName&background=random"
                className={avatarValidation && !avatarValidation.isValid ? 'border-destructive' : ''}
              />
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
              {profile.avatar && (
                <div className="text-xs text-muted-foreground">
                  Preview will appear in the avatar above when the URL is valid
                </div>
              )}
            </div>
          </div>
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

        {/* Privacy Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Public Profile</Label>
              <div className="text-sm text-muted-foreground">
                Allow others to see your profile and trade history
              </div>
            </div>
            <Switch
              id="isPublic"
              checked={profile.is_public}
              onCheckedChange={(checked) => setProfile({ ...profile, is_public: checked })}
            />
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
      </CardContent>
    </Card>
  );
}