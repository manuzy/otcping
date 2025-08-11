import { useState, useEffect } from "react";
import { Bell, Shield, Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import ProfileManager from "@/components/profile/ProfileManager";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import { logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { LoadingState } from "@/components/ui/loading-state";

export default function Settings() {
  const { isAuthenticated, address } = useWalletAuth();
  const { user } = useAuth();
  const { settings: notificationSettings, loading: notificationLoading, saving: notificationSaving, saveSettings } = useNotificationSettings();

  const [privacy, setPrivacy] = useState({
    showOnlineStatus: true,
    showTradingActivity: true,
    allowContactRequests: true,
    publicProfile: true,
  });

  // Load current profile data to get public setting
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    logger.info('Fetching profile data', { 
      component: 'Settings',
      operation: 'fetchProfileData',
      userId: user.id 
    });

    const { data, error } = await apiClient.selectSingle('profiles', `id.eq.${user.id}`, {
      context: { component: 'Settings', operation: 'fetchProfileData' }
    });

    if (error) {
      logger.error('Failed to fetch profile data', { userId: user.id }, new Error(error.message));
      return;
    }

    if (data) {
      setPrivacy(prev => ({ ...prev, publicProfile: data.is_public }));
      logger.info('Profile data loaded successfully', { userId: user.id });
    }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;

    logger.userAction('Saving privacy settings', { 
      component: 'Settings',
      userId: user.id,
      settings: privacy 
    });

    const { error } = await apiClient.update('profiles', user.id, {
      is_public: privacy.publicProfile
    }, {
      context: { component: 'Settings', operation: 'savePrivacy' },
      showSuccessToast: false
    });

    if (error) {
      logger.error('Failed to save privacy settings', { userId: user.id }, new Error(error.message));
      notifications.saveError('privacy settings');
      return;
    }

    notifications.saveSuccess('privacy settings');
    logger.info('Privacy settings saved successfully', { userId: user.id });
  };

  const handleSaveNotifications = async () => {
    if (!notificationSettings) return;
    await saveSettings(notificationSettings);
  };

  const updateNotificationSetting = (key: string, value: any) => {
    if (notificationSettings) {
      saveSettings({ [key]: value });
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          {isAuthenticated && address && (
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 rounded-lg border border-success/20">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 md:pb-4">
        
        {/* Profile Settings */}
        <ProfileManager />

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Email Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label>Email Notifications</Label>
                </div>
                <Switch
                  checked={notificationSettings?.enable_email || false}
                  onCheckedChange={(checked) => updateNotificationSetting('enable_email', checked)}
                  disabled={notificationLoading}
                />
              </div>
              {notificationSettings?.enable_email && (
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={notificationSettings?.email || ''}
                    onChange={(e) => updateNotificationSetting('email', e.target.value)}
                    disabled={notificationLoading}
                  />
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Notify for</Label>
                    <RadioGroup
                      value={notificationSettings?.email_frequency || 'first_only'}
                      onValueChange={(value) => updateNotificationSetting('email_frequency', value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="text-sm cursor-pointer">
                          All chat messages
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="first_only" id="first_only" />
                        <Label htmlFor="first_only" className="text-sm cursor-pointer">
                          Only first message of new user
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Telegram Notifications */}
            <div className="space-y-3 opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label>Telegram Notifications</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                />
              </div>
            </div>

            <Separator />

            {/* Slack Notifications */}
            <div className="space-y-3 opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label>Slack Notifications</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                />
              </div>
            </div>

            <Separator />

            {/* SMS Notifications */}
            <div className="space-y-3 opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <Label>SMS Notifications</Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
                </div>
                <Switch
                  checked={false}
                  disabled={true}
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveNotifications} 
              className="w-full"
              disabled={notificationLoading || notificationSaving}
            >
              {notificationSaving ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control your privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Online Status</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you're online
                </p>
              </div>
              <Switch 
                checked={privacy.showOnlineStatus}
                onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showOnlineStatus: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Trading Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Display your trading history to contacts
                </p>
              </div>
              <Switch 
                checked={privacy.showTradingActivity}
                onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showTradingActivity: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Contact Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Let others send you contact requests
                </p>
              </div>
              <Switch 
                checked={privacy.allowContactRequests}
                onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, allowContactRequests: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow your profile to appear in public user listings
                </p>
              </div>
              <Switch 
                checked={privacy.publicProfile}
                onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, publicProfile: checked }))}
              />
            </div>

            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authenticated</Label>
                  <p className="text-sm text-muted-foreground">
                    Your wallet is authenticated and profile is active
                  </p>
                </div>
                <div className="h-2 w-2 bg-green-500 rounded-full" />
              </div>
            )}

            <Button onClick={handleSavePrivacy} className="w-full">
              Save Privacy Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  );
}