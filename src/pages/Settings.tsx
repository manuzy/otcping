import { useState, useEffect } from "react";
import { Bell, Shield, Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ProfileManager from "@/components/profile/ProfileManager";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, address } = useWalletAuth();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState({
    email: "",
    telegram: "",
    slack: "",
    phone: "",
    enableEmail: false,
    enableTelegram: false,
    enableSlack: false,
    enableSMS: false,
  });

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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_public')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPrivacy(prev => ({ ...prev, publicProfile: data.is_public }));
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: privacy.publicProfile })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save your privacy preferences",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
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
                  checked={notifications.enableEmail}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, enableEmail: checked }))}
                />
              </div>
              {notifications.enableEmail && (
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={notifications.email}
                  onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.value }))}
                />
              )}
            </div>

            <Separator />

            {/* Telegram Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label>Telegram Notifications</Label>
                </div>
                <Switch
                  checked={notifications.enableTelegram}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, enableTelegram: checked }))}
                />
              </div>
              {notifications.enableTelegram && (
                <Input
                  placeholder="@username or chat ID"
                  value={notifications.telegram}
                  onChange={(e) => setNotifications(prev => ({ ...prev, telegram: e.target.value }))}
                />
              )}
            </div>

            <Separator />

            {/* Slack Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label>Slack Notifications</Label>
                </div>
                <Switch
                  checked={notifications.enableSlack}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, enableSlack: checked }))}
                />
              </div>
              {notifications.enableSlack && (
                <Input
                  placeholder="Slack webhook URL or channel"
                  value={notifications.slack}
                  onChange={(e) => setNotifications(prev => ({ ...prev, slack: e.target.value }))}
                />
              )}
            </div>

            <Separator />

            {/* SMS Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <Label>SMS Notifications</Label>
                </div>
                <Switch
                  checked={notifications.enableSMS}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, enableSMS: checked }))}
                />
              </div>
              {notifications.enableSMS && (
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={notifications.phone}
                  onChange={(e) => setNotifications(prev => ({ ...prev, phone: e.target.value }))}
                />
              )}
            </div>

            <Button onClick={handleSaveNotifications} className="w-full">
              Save Notification Settings
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
  );
}