import { useState } from "react";
import { Camera, Bell, Shield, User, Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAppKitAccount } from '@reown/appkit/react';
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { address } = useAppKitAccount();
  
  const [profileData, setProfileData] = useState({
    displayName: address ? `User ${address.slice(-4)}` : "User",
    description: "",
    isPublic: false,
  });

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

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your profile settings have been saved successfully.",
    });
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
      <div className="border-b border-border p-4">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 md:pb-4">
        
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your public profile and display preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback>{address ? address.slice(0, 2).toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <Button variant="outline" className="gap-2">
                <Camera className="h-4 w-4" />
                Change Photo
              </Button>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter your display name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={profileData.description}
                onChange={(e) => setProfileData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tell others about yourself and your trading experience..."
                rows={3}
              />
            </div>


            <Button onClick={handleSaveProfile} className="w-full">
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

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
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Trading Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Display your trading history to contacts
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Contact Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Let others send you contact requests
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to see your profile in public listings
                </p>
              </div>
              <Switch
                checked={profileData.isPublic}
                onCheckedChange={(checked) => setProfileData(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}